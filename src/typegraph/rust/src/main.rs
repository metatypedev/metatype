use exports::metatype::typegraph::core::{Cors, TypegraphInitParams};
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

    fn path_exists(&mut self, _path: String) -> Result<bool, String> {
        todo!()
    }

    fn read_file(&mut self, _path: String) -> Result<Vec<u8>, String> {
        todo!()
    }

    fn write_file(&mut self, _path: String, _data: Vec<u8>) -> Result<(), String> {
        todo!()
    }

    fn get_cwd(&mut self) -> Result<String, String> {
        todo!()
    }
}

fn main() -> Result<()> {
    let mut config = Config::new();

    config.wasm_component_model(true);

    let engine = Engine::new(&config)?;
    let component = Component::from_binary(&engine, WASM_BINARY)?;
    let mut linker = Linker::new(&engine);

    Typegraph::add_to_linker(&mut linker, |state: &mut State| state)?;

    let mut store = Store::new(&engine, State {});
    let (world, _) = Typegraph::instantiate(&mut store, &component, &linker)?;

    let core = world.metatype_typegraph_core();

    let init_params = TypegraphInitParams {
        name: "".to_string(),
        dynamic: None,
        path: ".".to_string(),
        prefix: None,
        cors: Cors {
            allow_origin: vec![],
            allow_headers: vec![],
            expose_headers: vec![],
            allow_methods: vec![],
            allow_credentials: false,
            max_age_sec: None,
        },
        rate: None,
    };

    core.call_init_typegraph(&mut store, &init_params)?.unwrap();

    Ok(())
}
