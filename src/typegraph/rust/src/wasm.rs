use std::{cell::RefCell, env, fs, io};

use metatype::typegraph::host::Host;
use wasmtime::{
    component::{bindgen, Component, Linker},
    Config, Engine, Result, Store,
};

const WASM_BINARY: &[u8] =
    include_bytes!("../../../../target/wasm/wasm32-unknown-unknown/release/typegraph_core.wasm");

bindgen!({
    path: "../core/wit/",
    world: "typegraph",
});

pub use self::exports::metatype::typegraph::{aws, core, runtimes, utils};

pub struct State {}

impl Host for State {
    fn print(&mut self, s: String) {
        println!("{s}");
    }

    fn eprint(&mut self, s: String) {
        eprintln!("{s}");
    }

    fn expand_path(&mut self, _root: String, _exclude: Vec<String>) -> Result<Vec<String>, String> {
        todo!()
    }

    fn path_exists(&mut self, path: String) -> Result<bool, String> {
        match fs::metadata(path) {
            Ok(_) => Ok(true),
            Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(err) => Err(err.to_string()),
        }
    }

    fn read_file(&mut self, path: String) -> Result<Vec<u8>, String> {
        fs::read(path).map_err(|err| err.to_string())
    }

    fn write_file(&mut self, path: String, data: Vec<u8>) -> Result<(), String> {
        fs::write(path, data).map_err(|err| err.to_string())
    }

    fn get_cwd(&mut self) -> Result<String, String> {
        match env::current_dir() {
            Ok(path) => Ok(path.to_string_lossy().to_string()),
            Err(err) => Err(err.to_string()),
        }
    }
}

thread_local! {
    static ENGINE: Engine = Engine::new(Config::new().wasm_component_model(true)).unwrap();
    static STORE: RefCell<Store<State>> = ENGINE.with(|e| Store::new(e, State {})).into();

    static WORLD: Typegraph = STORE.with_borrow_mut(|s| {
        let component: Component = ENGINE.with(|e| Component::from_binary(e, WASM_BINARY)).unwrap();
        let mut linker: Linker<State> = ENGINE.with(|e| Linker::new(e));

        Typegraph::add_to_linker(&mut linker, |state: &mut State| state).unwrap();
        Typegraph::instantiate(s, &component, &linker).map(|(world, _)| world).unwrap()
    });
}

pub fn with_core<F, T>(f: F) -> T
where
    F: Fn(&core::Guest, &mut Store<State>) -> T,
{
    WORLD.with(|w| STORE.with_borrow_mut(|s| f(w.metatype_typegraph_core(), s)))
}

pub fn with_runtimes<F, T>(f: F) -> T
where
    F: Fn(&runtimes::Guest, &mut Store<State>) -> T,
{
    WORLD.with(|w| STORE.with_borrow_mut(|s| f(w.metatype_typegraph_runtimes(), s)))
}

pub fn with_aws<F, T>(f: F) -> T
where
    F: Fn(&aws::Guest, &mut Store<State>) -> T,
{
    WORLD.with(|w| STORE.with_borrow_mut(|s| f(w.metatype_typegraph_aws(), s)))
}

pub fn with_utils<F, T>(f: F) -> T
where
    F: Fn(&utils::Guest, &mut Store<State>) -> T,
{
    WORLD.with(|w| STORE.with_borrow_mut(|s| f(w.metatype_typegraph_utils(), s)))
}
