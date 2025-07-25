// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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

                // add all worlds from crate to linker
                // TODO(@yohe): determine and add only select linkers
                // componentize-py adds all the command worlds
                // so we'll have to fix that there first
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
            // for most components, we'll rely on wasmtime's cache which takes into account
            // hashes
            // we only manually cache inline components since they'll never change
            // and we want to avoid the decompression cost
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
    id: String,
    bindings: wit::WitWire,
    store: wasmtime::Store<InstanceState>,
    preopen_dir: PathBuf,
}

// An Instance's lifetime is tied to a thread (worker)
// The Instance is dropped when a worker is terminated
impl Drop for Instance {
    fn drop(&mut self) {
        let id = self.id.clone();
        let preopen_dir = self.preopen_dir.clone();

        debug!("destroying wit_wire instance {id}");

        // FIXME: Does it really have to be async?
        std::mem::drop(tokio::task::spawn(async move {
            debug!("Removing preopened dir: {preopen_dir:?}");

            match tokio::fs::remove_dir_all(&preopen_dir).await {
                Err(err) if err.kind() != std::io::ErrorKind::NotFound => {
                    error!(
                        "error removing preopend dir for instance {id} at {:?}: {err}",
                        preopen_dir
                    )
                }
                _ => {
                    debug!("preopened dir removed for instance {id}")
                }
            }
        }));
    }
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

#[wasmtime_wasi::async_trait]
impl Host for TypegateHost {
    async fn hostcall(
        &mut self,
        op_name: String,
        json: String,
    ) -> wasmtime::Result<Result<String, String>> {
        if op_name.len() > v8::String::MAX_LENGTH {
            return Ok(Err("invalid op_name: too long".to_string()));
        }
        if json.len() > v8::String::MAX_LENGTH {
            return Ok(Err("invalid json: too long".to_string()));
        }
        let js_fn = SendPtr(self.js_fn.0);
        let spawner = self.async_work_sender.clone();

        let (tx, rx) = tokio::sync::oneshot::channel();
        let join_handle = tokio::task::spawn_blocking(move || {
            // NOTE: the whole affair is single threaded so
            // there's no need for a semaphore when accessing
            // the hostcall
            spawner.spawn_blocking(move |scope| {
                let params: [v8::Local<v8::Value>; 2] = [
                    v8::String::new(scope, &op_name).unwrap().into(),
                    v8::String::new(scope, &json).unwrap().into(),
                ];
                let recv = v8::undefined(scope);
                let promise = {
                    let tc_scope = &mut v8::TryCatch::new(scope);
                    // FIXME(@yohe): the original pointer was made from a global
                    // and yet we're transmuting it to a Local here.
                    // This is observed from the deno codebase
                    // and I can't explain it
                    let func = unsafe {
                        std::mem::transmute::<SendPtr<v8::Function>, v8::Local<v8::Function>>(js_fn)
                    };
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
                    .map_err(|_err| "unexpected value from hostcall".to_string())?;

                // we use raw pointers here when passing data into v8 functions
                let external = v8::External::new(scope, Box::into_raw(Box::new(tx)) as _);
                fn get_sender(
                    data: v8::Local<v8::Value>,
                ) -> tokio::sync::oneshot::Sender<Result<String, String>> {
                    let sender = v8::Local::<v8::External>::try_from(data).unwrap();
                    *unsafe { Box::from_raw(sender.value() as _) }
                }

                let on_fullfilled = v8::Function::builder(
                    // this is not closure but a static fn
                    // so we can't close over anything
                    // but instead use data to pass values
                    |scope: &mut v8::HandleScope<'_>,
                     args: v8::FunctionCallbackArguments<'_>,
                     _rv: v8::ReturnValue<'_>| {
                        let tx = get_sender(args.data());
                        let Some(json) = v8::json::stringify(scope, args.get(0)) else {
                            tx.send(Err("error jsonifying result".to_string())).unwrap();
                            return;
                        };
                        tx.send(Ok(json.to_rust_string_lossy(scope))).unwrap();
                    },
                )
                // channel is oneshot but we can be sure
                // either only on_fullfilled or on_rejected will run
                .data(external.into())
                .build(scope);
                let on_rejected = v8::Function::builder(
                    move |scope: &mut v8::HandleScope<'_>,
                          args: v8::FunctionCallbackArguments<'_>,
                          _rv: v8::ReturnValue<'_>| {
                        let tx = get_sender(args.data());
                        let Some(json) = v8::json::stringify(scope, args.get(0)) else {
                            tx.send(Err("error jsonifying result".to_string())).unwrap();
                            return;
                        };
                        tx.send(Err(json.to_rust_string_lossy(scope))).unwrap();
                    },
                )
                .data(external.into())
                .build(scope);
                promise.then2(scope, on_fullfilled.unwrap(), on_rejected.unwrap());
                Ok(())
            })
        });
        if let Err(msg) = join_handle.await.expect("tokio spawn_blocking error") {
            return Ok(Err(msg));
        }
        let res = rx.await.expect("oneshot recieve error");
        Ok(res)
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

#[derive(Debug, thiserror::Error, deno_error::JsError)]
pub enum WitWireInitError {
    #[class(generic)]
    #[error("metatype version mismatch: {0:?}")]
    VersionMismatch(String),
    #[class(generic)]
    #[error("unexpected mat info: {0:?}")]
    UnexpectedMat(WitWireMatInfo),
    #[class(generic)]
    #[error("unexpected error: {0:?}")]
    Other(String),
    #[class(generic)]
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
pub async fn op_wit_wire_init(
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
    let bindings = wit::WitWire::instantiate_async(&mut store, &component, &ctx.linker)
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
        instance_id.clone(),
        Instance {
            id: instance_id,
            bindings,
            store,
            preopen_dir: work_dir,
        },
    );
    Ok(WitWireInitResponse {})
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

#[derive(Debug, thiserror::Error, deno_error::JsError)]
pub enum WitWireHandleError {
    #[class(generic)]
    #[error("instance not found under id {id}")]
    InstanceNotFound { id: String },
    #[class(generic)]
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
