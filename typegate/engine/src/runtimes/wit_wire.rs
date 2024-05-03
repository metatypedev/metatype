// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
use dashmap::DashMap;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work
use deno_core::OpState;
use wasmtime::component::{Component, Linker};
use wit::exports::metatype::wit_wire::mat_wire::{InitArgs, InitError, MatInfo};
use wit::metatype::wit_wire::typegate_wire::Host;

use self::wit::exports::metatype::wit_wire::mat_wire::{HandleErr, HandleReq};
use std::ptr::NonNull;

mod wit {
    wasmtime::component::bindgen!({
        world: "wit-wire",
        path: "../../wit/",
        async: true,
        trappable_imports: true,
    });
}

#[derive(Clone)]
pub struct Ctx {
    engine: wasmtime::Engine,
    instances: Arc<DashMap<String, Instance>>,
    instance_workdir: PathBuf,
    linker: Linker<InstanceState>,
    cached_components: DashMap<String, Component>,
}

impl Ctx {
    pub fn new(engine: wasmtime::Engine, instance_workdir: PathBuf) -> anyhow::Result<Self> {
        Ok(Self {
            instances: Default::default(),
            instance_workdir,
            cached_components: Default::default(),
            linker: {
                let mut linker = Linker::<InstanceState>::new(&engine);

                wasmtime_wasi::add_to_linker_async(&mut linker)?;
                wit::WitWire::add_to_linker(&mut linker, |state| &mut state.tg_host)?;

                linker
            },
            engine,
        })
    }

    async fn get_component(&self, wasm_relative_path: String) -> Result<Component, String> {
        let engine = self.engine.clone();
        let comp = if wasm_relative_path == "inline://pyrt_wit_wire.cwasm" {
            // we only manually cache inline components since they'll never change
            if let Some(comp) = self.cached_components.get(&wasm_relative_path) {
                return Ok(comp.clone());
            }
            let cwasm_zst_bytes = include_bytes!(concat!(env!("OUT_DIR"), "/pyrt.cwasm.zst"));
            let comp = tokio::task::spawn_blocking(move || unsafe {
                let mut cwasm_bytes = vec![];
                zstd::stream::copy_decode(&cwasm_zst_bytes[..], &mut cwasm_bytes)
                    .map_err(|err| format!("error decompressing serialized component: {err}"))?;
                Component::deserialize(&engine, cwasm_bytes)
                    .map_err(|err| format!("error loading pyrt serialized component: {err}"))
            })
            .await
            .map_err(|err| format!("tokio error loading serialized component: {err}"))??;
            self.cached_components
                .insert(wasm_relative_path, comp.clone());
            comp
        } else {
            // for user provided components, we let wasmtime take care
            // of the caching
            let wasm_absolute_path = match std::env::current_dir() {
                Ok(cwd) => cwd.join(&wasm_relative_path),
                Err(err) => return Err(format!("error trying to find cwd: {err}")),
            };
            let raw = tokio::fs::read(&wasm_absolute_path).await.map_err(|err| {
                format!("error loading serialized component from {wasm_relative_path}: {err}")
            })?;
            tokio::task::spawn_blocking(move || Component::from_binary(&engine, &raw[..]))
                .await
                .map_err(|err| format!("tokio error loading component: {err}"))?
                .map_err(|err| format!("error loading component: {err}"))?
        };
        Ok(comp)
    }
}

struct Instance {
    bindings: wit::WitWire,
    _instance: wasmtime::component::Instance,
    store: wasmtime::Store<InstanceState>,
    preopen_dir: PathBuf,
}

struct InstanceState {
    table: wasmtime_wasi::ResourceTable,
    ctx: wasmtime_wasi::WasiCtx,
    tg_host: TypegateHost,
}

impl InstanceState {
    fn new(preopen_dir: impl AsRef<Path>, tg_host: TypegateHost) -> Self {
        let preopen_dir = preopen_dir.as_ref();
        Self {
            ctx: wasmtime_wasi::WasiCtxBuilder::new()
                .allow_ip_name_lookup(true)
                .preopened_dir(
                    preopen_dir,
                    ".",
                    wasmtime_wasi::DirPerms::all(),
                    wasmtime_wasi::FilePerms::all(),
                )
                .with_context(|| format!("error preopening dir for instance at {preopen_dir:?}"))
                .unwrap()
                // TODO: stream stdio to debug log
                .inherit_stdout()
                .inherit_stderr()
                .build(),
            table: Default::default(),
            tg_host,
        }
    }
}

impl wasmtime_wasi::WasiView for InstanceState {
    fn table(&mut self) -> &mut wasmtime_wasi::ResourceTable {
        &mut self.table
    }

    fn ctx(&mut self) -> &mut wasmtime_wasi::WasiCtx {
        &mut self.ctx
    }
}
#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WitWireInitArgs {
    metatype_version: String,
    expected_ops: Vec<WitWireMatInfo>,
}

struct TypegateHost {
    js_fn: SendPtr<v8::Function>,
    async_work_sender: deno_core::V8CrossThreadTaskSpawner,
}

#[derive(Clone, Copy)]
#[repr(transparent)]
struct SendPtr<T>(NonNull<T>);
unsafe impl<T> Send for SendPtr<T> {}

impl TypegateHost {
    fn drop(self, scope: &mut v8::HandleScope) {
        unsafe {
            _ = v8::Global::from_raw(scope, self.js_fn.0);
        }
    }
}

#[wasmtime_wasi::async_trait]
impl Host for TypegateHost {
    async fn hostcall(
        &mut self,
        op_name: String,
        json: String,
    ) -> wasmtime::Result<Result<String, String>> {
        if op_name.len() > v8::String::max_length() {
            return Ok(Err(format!("invalid op_name: too long")));
        }
        if json.len() > v8::String::max_length() {
            return Ok(Err(format!("invalid json: too long")));
        }
        let js_fn = SendPtr(self.js_fn.0.clone());
        let spawner = self.async_work_sender.clone();

        let (tx, rx) = tokio::sync::mpsc::channel(1);
        tokio::task::spawn_blocking(move || {
            spawner.spawn_blocking(move |scope| {
                let params: [v8::Local<v8::Value>; 2] = [
                    v8::String::new(scope, &op_name).unwrap().into(),
                    v8::String::new(scope, &json).unwrap().into(),
                ];
                let recv = v8::undefined(scope);
                let promise = {
                    let tc_scope = &mut v8::TryCatch::new(scope);
                    let func = unsafe { std::mem::transmute::<_, v8::Local<v8::Function>>(js_fn) };
                    let res = func
                        .call(tc_scope, recv.into(), &params)
                        .expect("got null from hostcall");
                    if tc_scope.has_caught() {
                        return Err(format!(
                            "error: {}",
                            tc_scope
                                .exception()
                                .unwrap()
                                .to_string(tc_scope)
                                .unwrap()
                                .to_rust_string_lossy(tc_scope)
                        ));
                    }
                    res
                };
                let promise = v8::Local::<v8::Promise>::try_from(promise)
                    .map_err(|_err| format!("unexpected value from hostcall"))?;
                let full_tx = tx.clone();
                let rej_tx = tx.clone();
                promise.then2(
                    scope,
                    v8::Function::builder(
                        |scope: &mut v8::HandleScope<'_>,
                         args: v8::FunctionCallbackArguments<'_>,
                         _rv: v8::ReturnValue<'_>| {
                            let data = args.data();
                            let Some(json) = v8::json::stringify(scope, data) else {
                                tx.send(Err(format!("error jsonifying result"))).unwrap();
                                return;
                            };
                            full_tx.send(Ok(json.to_rust_string_lossy(scope))).unwrap();
                        },
                    )
                    .build(scope)
                    .unwrap(),
                    v8::Function::builder(
                        move |scope: &mut v8::HandleScope<'_>,
                              args: v8::FunctionCallbackArguments<'_>,
                              _rv: v8::ReturnValue<'_>| {
                            let data = args.data();
                            let Some(json) = v8::json::stringify(scope, data) else {
                                tx.send(Err(format!("error jsonifying result"))).unwrap();
                                return;
                            };
                            rej_tx.send(Err(json.to_rust_string_lossy(scope))).unwrap();
                        },
                    )
                    .build(scope)
                    .unwrap(),
                );
                Ok(())
            })
        })
        .await
        .expect("tokio spawn_blocking error");
        let res = rx.await.expect("oneshot recieve error");
        Ok(dbg!(res))
    }
}

impl From<WitWireInitArgs> for InitArgs {
    fn from(value: WitWireInitArgs) -> Self {
        InitArgs {
            metatype_version: value.metatype_version,
            expected_ops: value.expected_ops.into_iter().map(Into::into).collect(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(crate = "serde")]
pub struct WitWireMatInfo {
    op_name: String,
    mat_title: String,
    mat_hash: String,
    mat_data_json: String,
}

impl From<MatInfo> for WitWireMatInfo {
    fn from(value: MatInfo) -> Self {
        WitWireMatInfo {
            op_name: value.op_name,
            mat_title: value.mat_title,
            mat_hash: value.mat_hash,
            mat_data_json: value.mat_data_json,
        }
    }
}

impl From<WitWireMatInfo> for MatInfo {
    fn from(value: WitWireMatInfo) -> Self {
        MatInfo {
            op_name: value.op_name,
            mat_title: value.mat_title,
            mat_hash: value.mat_hash,
            mat_data_json: value.mat_data_json,
        }
    }
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct WitWireInitResponse {}

#[derive(Serialize, Debug, thiserror::Error)]
#[serde(crate = "serde")]
pub enum WitWireInitError {
    #[error("metatype version mismatch: {0:?}")]
    VersionMismatch(String),
    #[error("unexpected mat info: {0:?}")]
    UnexpectedMat(WitWireMatInfo),
    #[error("unexpected error: {0:?}")]
    Other(String),
    #[error("wasm module error: {0:?}")]
    ModuleErr(String),
}

impl From<InitError> for WitWireInitError {
    fn from(value: InitError) -> Self {
        match value {
            InitError::VersionMismatch(ver) => Self::VersionMismatch(ver),
            InitError::UnexpectedMat(info) => Self::UnexpectedMat(info.into()),
            InitError::Other(msg) => Self::Other(msg),
        }
    }
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_wit_wire_init<'scope>(
    state: Rc<RefCell<OpState>>,
    // scope: &mut v8::HandleScope<'scope>,
    #[string] component_path: String,
    #[string] instance_id: String,
    #[serde] input: WitWireInitArgs,
    #[global] hostcall_cb: v8::Global<v8::Function>,
) -> Result<WitWireInitResponse, WitWireInitError> {
    let (ctx, spawner) = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        let spawner = state.borrow::<deno_core::V8CrossThreadTaskSpawner>();
        (ctx.clone(), spawner.clone())
    };

    let component = ctx
        .get_component(component_path)
        .await
        .map_err(WitWireInitError::ModuleErr)?;

    let work_dir = ctx.instance_workdir.join(&instance_id);
    tokio::fs::create_dir_all(&work_dir)
        .await
        .expect("error creating instance workdir");
    let mut store = wasmtime::Store::new(
        &ctx.engine,
        InstanceState::new(
            &work_dir,
            TypegateHost {
                js_fn: SendPtr(hostcall_cb.into_raw()),
                async_work_sender: spawner,
            },
        ),
    );
    let (bindings, instance) = wit::WitWire::instantiate_async(&mut store, &component, &ctx.linker)
        .await
        .map_err(|err| {
            WitWireInitError::ModuleErr(format!("error tring to make component instance: {err}"))
        })?;
    let guest = bindings.metatype_wit_wire_mat_wire();
    let args = input.into();
    let res = guest.call_init(&mut store, &args).await.map_err(|err| {
        WitWireInitError::ModuleErr(format!("module error calling init: {err}"))
    })??; // <- note second try for the wit err. we have an into impl above
    assert!(res.ok);
    ctx.instances.insert(
        instance_id,
        Instance {
            _instance: instance,
            bindings,
            store,
            preopen_dir: work_dir,
        },
    );
    Ok(WitWireInitResponse {})
}

#[deno_core::op2]
pub fn op_wit_wire_destroy<'scope>(
    state: Rc<RefCell<OpState>>,
    scope: &mut v8::HandleScope<'scope>,
    #[string] instance_id: String,
) {
    println!("destroying {instance_id}");
    let ctx = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clone()
    };

    let Some((_id, instance)) = ctx.instances.remove(&instance_id) else {
        return;
    };
    println!("got this far {instance_id}");
    let tg_host = instance.store.into_data().tg_host;
    println!("got this far 2 {instance_id}");
    tg_host.drop(scope);
    println!("got this far 3 {instance_id}");
    _ = tokio::task::spawn(async move {
        if let Err(err) = tokio::fs::remove_dir_all(&instance.preopen_dir).await {
            error!(
                "error removing preopend dir for instance {_id} at {:?}: {err}",
                instance.preopen_dir
            )
        }
    });
    println!("destroyed {instance_id}");
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WitWireReq {
    op_name: String,
    in_json: String,
}

impl From<WitWireReq> for HandleReq {
    fn from(value: WitWireReq) -> Self {
        Self {
            op_name: value.op_name,
            in_json: value.in_json,
        }
    }
}

#[derive(Serialize, Debug, thiserror::Error)]
#[serde(crate = "serde")]
pub enum WitWireHandleError {
    #[error("instance not found under id {id}")]
    InstanceNotFound { id: String },
    #[error("wasm module error: {0:?}")]
    ModuleErr(String),
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub enum HandleRes {
    Ok(String),
    NoHandler,
    InJsonErr(String),
    HandlerErr(String),
}

#[deno_core::op2(async)]
#[serde]
pub async fn op_wit_wire_handle(
    state: Rc<RefCell<OpState>>,
    #[string] instance_id: String,
    #[serde] input: WitWireReq,
) -> Result<HandleRes, WitWireHandleError> {
    let ctx = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clone()
    };

    let mut instance = ctx
        .instances
        .get_mut(&instance_id)
        .ok_or(WitWireHandleError::InstanceNotFound { id: instance_id })?;
    // reborrow https://bevy-cheatbook.github.io/pitfalls/split-borrows.html
    let instance = &mut *instance;
    let guest = instance.bindings.metatype_wit_wire_mat_wire();
    let res = guest
        .call_handle(&mut instance.store, &input.into())
        .await
        .map_err(|err| {
            WitWireHandleError::ModuleErr(format!("module error calling handle: {err}"))
        })?;
    Ok(match res {
        Ok(json) => HandleRes::Ok(json),
        Err(err) => match err {
            HandleErr::NoHandler => HandleRes::NoHandler,
            HandleErr::InJsonErr(msg) => HandleRes::InJsonErr(msg),
            HandleErr::HandlerErr(msg) => HandleRes::HandlerErr(msg),
        },
    })
}
