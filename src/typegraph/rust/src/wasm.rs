use std::cell::RefCell;

use wasmtime::{
    component::{bindgen, Component, Linker},
    Config, Engine, Store,
};

use crate::host::State;

const WASM_BINARY: &[u8] =
    include_bytes!("../../../../target/wasm/wasm32-unknown-unknown/release/typegraph_core.wasm");

bindgen!({
    path: "../core/wit/",
    world: "typegraph",
});

pub use self::exports::metatype::typegraph::{aws, core, runtimes, utils};

thread_local! {
    static ENGINE: Engine = Engine::new(Config::new().wasm_component_model(true)).unwrap();
    static STORE: RefCell<Store<State>> = ENGINE.with(|e| Store::new(e, State {})).into();

    static TYPEGRAPH: Typegraph = STORE.with_borrow_mut(|s| {
        let component: Component = ENGINE.with(|e| Component::from_binary(e, WASM_BINARY)).unwrap();
        let mut linker: Linker<State> = ENGINE.with(Linker::new);
        Typegraph::add_to_linker(&mut linker, |state: &mut State| state).unwrap();
        Typegraph::instantiate(s, &component, &linker).map(|(world, _)| world).unwrap()
    });
}

pub fn with_core<F, T>(f: F) -> T
where
    F: Fn(&core::Guest, &mut Store<State>) -> wasmtime::Result<T>,
{
    TYPEGRAPH.with(|t| STORE.with_borrow_mut(|s| f(t.metatype_typegraph_core(), s).unwrap()))
}

pub fn with_runtimes<F, T>(f: F) -> T
where
    F: Fn(&runtimes::Guest, &mut Store<State>) -> wasmtime::Result<T>,
{
    TYPEGRAPH.with(|t| STORE.with_borrow_mut(|s| f(t.metatype_typegraph_runtimes(), s).unwrap()))
}

pub fn with_aws<F, T>(f: F) -> T
where
    F: Fn(&aws::Guest, &mut Store<State>) -> wasmtime::Result<T>,
{
    TYPEGRAPH.with(|t| STORE.with_borrow_mut(|s| f(t.metatype_typegraph_aws(), s).unwrap()))
}

pub fn with_utils<F, T>(f: F) -> T
where
    F: Fn(&utils::Guest, &mut Store<State>) -> wasmtime::Result<T>,
{
    TYPEGRAPH.with(|t| STORE.with_borrow_mut(|s| f(t.metatype_typegraph_utils(), s).unwrap()))
}
