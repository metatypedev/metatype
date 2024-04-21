// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
use dashmap::DashMap;
#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work
use deno_core::OpState;

mod wit {
    wasmtime::component::bindgen!({
        path: "../../libs/pyrt_wit_wire/wit",
        async: true,
    });
}
use wasmtime::component::{Component, Linker};
use wit::exports::metatype::pyrt::mat_wire::{InitArgs, InitError, MatInfo, Req as MatReq};
use wit::metatype::pyrt::typegate_wire::{Host, Req as HostReq, Res as HostRes};

#[derive(Clone)]
pub struct Ctx {
    engine: wasmtime::Engine,
    instances: Arc<DashMap<String, Instance>>,
    components: Arc<DashMap<PathBuf, LinkedComponent>>,
}

#[derive(Clone)]
struct LinkedComponent(Component, Arc<Linker<TypegateHost>>);

/* static WASI_CTX: once_cell::sync::Lazy<wasmtime_wasi::WasiCtx> = once_cell::sync::Lazy::new(|| {
    wasmtime_wasi::WasiCtxBuilder::new()
        .allow_ip_name_lookup(true)
        .build()
}); */

impl Ctx {
    pub fn new(engine: wasmtime::Engine) -> Self {
        Self {
            instances: Default::default(),
            components: Default::default(),
            engine,
        }
    }

    async fn get_component(&self, wasm_relative_path: PathBuf) -> Result<LinkedComponent, String> {
        let wasm_absolute_path = match std::env::current_dir() {
            Ok(cwd) => cwd.join(wasm_relative_path),
            Err(err) => return Err(format!("error trying to find cwd: {err}")),
        };

        let comp = if let Some(comp) = self.components.get(&wasm_absolute_path) {
            comp.clone()
        } else {
            let engine = self.engine.clone();
            let path_clone = wasm_absolute_path.clone();
            let comp = if wasm_absolute_path
                .extension()
                .map(|ext| ext == "cwasm")
                .unwrap_or_default()
            {
                // TODO: self manage precompilation cache
                tokio::task::spawn_blocking(move || unsafe {
                    Component::deserialize_file(&engine, &path_clone)
                })
                .await
                .map_err(|err| format!("tokio error loading serialized component: {err}"))?
                .map_err(|err| format!("error loading serialized component: {err}"))?
            } else {
                tokio::task::spawn_blocking(move || Component::from_file(&engine, &path_clone))
                    .await
                    .map_err(|err| format!("tokio error loading component: {err}"))?
                    .map_err(|err| format!("error loading component: {err}"))?
            };

            let mut linker = Linker::<TypegateHost>::new(&self.engine);

            for res in [
                wasmtime_wasi::bindings::Imports::add_to_linker(&mut linker, |host| host),
                wit::Pyrt::add_to_linker(&mut linker, |host| host),
            ] {
                res.map_err(|err| format!("erorr trying to link component: {err}"))?;
            }
            self.components
                .entry(wasm_absolute_path)
                .insert_entry(LinkedComponent(comp, linker.into()))
                .get()
                .clone()
        };
        Ok(comp)
    }
}

struct Instance {
    bindings: wit::Pyrt,
    _instance: wasmtime::component::Instance,
    store: wasmtime::Store<TypegateHost>,
}

struct TypegateHost {
    table: wasmtime_wasi::ResourceTable,
    ctx: wasmtime_wasi::WasiCtx,
}

impl TypegateHost {
    fn new() -> Self {
        Self {
            ctx: wasmtime_wasi::WasiCtxBuilder::new()
                .allow_ip_name_lookup(true)
                // TODO: stream stdio to debug log
                .inherit_stdio()
                .build(),
            table: Default::default(),
        }
    }
}

#[async_trait::async_trait]
impl Host for TypegateHost {
    async fn hostcall(&mut self, _req: HostReq) -> wasmtime::Result<HostRes> {
        todo!()
    }
}

impl wit::metatype::pyrt::shared::Host for TypegateHost {}

impl wasmtime_wasi::WasiView for TypegateHost {
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
pub async fn op_wit_wire_init(
    state: Rc<RefCell<OpState>>,
    #[string] component_path: String,
    #[string] instance_id: String,
    #[serde] input: WitWireInitArgs,
) -> Result<WitWireInitResponse, WitWireInitError> {
    let ctx = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clone()
    };

    let LinkedComponent(ref component, ref linker) = ctx
        .get_component(PathBuf::from(component_path))
        .await
        .map_err(WitWireInitError::ModuleErr)?;

    let mut store = wasmtime::Store::new(&ctx.engine, TypegateHost::new());
    let (bindings, instance) = wit::Pyrt::instantiate_async(&mut store, component, linker)
        .await
        .map_err(|err| {
            WitWireInitError::ModuleErr(format!("error tring to make component instance: {err}"))
        })?;
    let guest = bindings.metatype_pyrt_mat_wire();
    let args = input.into();
    let res = guest.call_init(&mut store, &args).await.map_err(|err| {
        WitWireInitError::ModuleErr(format!("module error calling init: {err}"))
    })??;
    assert!(res.ok);
    ctx.instances.insert(
        instance_id,
        Instance {
            _instance: instance,
            bindings,
            store,
        },
    );
    Ok(WitWireInitResponse {})
}

#[deno_core::op2(async)]
pub async fn op_wit_wire_destroy(state: Rc<RefCell<OpState>>, #[string] instance_id: String) {
    let ctx = {
        let state = state.borrow();
        let ctx = state.borrow::<Ctx>();
        ctx.clone()
    };

    ctx.instances.remove(&instance_id);
}

#[derive(Deserialize)]
#[serde(crate = "serde")]
pub struct WitWireReq {
    op_name: String,
    in_json: String,
}

impl From<WitWireReq> for MatReq {
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
    #[error("mat error: {0:?}")]
    MatErr(String),
    #[error("wasm module error: {0:?}")]
    ModuleErr(String),
}

#[deno_core::op2(async)]
#[string]
pub async fn op_wit_wire_handle(
    state: Rc<RefCell<OpState>>,
    #[string] instance_id: String,
    #[serde] input: WitWireReq,
) -> Result<String, WitWireHandleError> {
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
    let guest = instance.bindings.metatype_pyrt_mat_wire();
    let res = guest
        .call_handle(&mut instance.store, &input.into())
        .await
        .map_err(|err| {
            WitWireHandleError::ModuleErr(format!("module error calling handle: {err}"))
        })?;
    res.map_err(WitWireHandleError::MatErr)
}
