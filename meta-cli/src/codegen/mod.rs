use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use crate::typegraph::Typegraph;

#[derive(Serialize, Deserialize, Debug)]
struct FuncData {
    materializer: u32,
    input: u32,
    output: u32,
}

#[derive(Serialize, Deserialize)]
struct FuncMatData {
    serial: bool,
    name: String,
    import_from: Option<String>,
}

pub fn apply<P>(tg_json: &str, base_dir: P)
where
    P: AsRef<Path>,
{
    let mut cg = Codegen::new(tg_json, base_dir);
    cg.apply();
}

struct ModuleInfo {
    path: PathBuf,
    exports: Option<Vec<String>>, // names of exported functions
}

struct Codegen {
    path: PathBuf,
    base_dir: PathBuf,
    ts_modules: HashMap<String, ModuleInfo>,
    tg: Option<Typegraph>,
}

impl Codegen {
    fn new<P>(tg_json: &str, path: P) -> Self
    where
        P: AsRef<Path>,
    {
        let tg: Typegraph = serde_json::from_str(tg_json).expect("invalid typegraph JSON");
        let path = path.as_ref().to_path_buf();
        let base_dir = {
            let mut dir = path.clone();
            if !dir.pop() {
                panic!("invalid file path");
            }
            dir
        };

        let ts_modules = {
            let mut modules = HashMap::new();
            for code in tg.codes.iter() {
                if &code.typ == "module" {
                    if let Some(path) = code.source.strip_prefix("file:") {
                        let mod_name = &code.name;
                        println!("module {mod_name}: {path}");
                        modules.insert(
                            code.name.clone(),
                            ModuleInfo {
                                path: PathBuf::from_str(path).unwrap(),
                                exports: None, // lazy
                            },
                        );
                    }
                }
            }
            modules
        };
        Codegen {
            path,
            base_dir,
            ts_modules,
            tg: Some(tg),
        }
    }

    fn apply(&mut self) {
        let tg = self.tg.take().unwrap();

        for tpe in tg.types {
            if tpe.typedef != "func" && tpe.typedef != "gen" {
                continue;
            }
            let func_data: FuncData = serde_json::from_value(tpe.data.clone().into_json())
                .expect("invalid type data for func");
            let mat = tg.materializers[func_data.materializer as usize].clone();
            if mat.name == "function" {
                let mat_data: FuncMatData = serde_json::from_value(mat.data.into_json())
                    .expect("invalid materializer data for function materializer");
                if let Some(mod_name) = mat_data.import_from.clone() {
                    self.gen_func(&mod_name, mat_data);
                    // TODO:
                }
                // TODO:
            }
        }
    }

    fn exported_functions<P>(mod_path: P) -> Vec<String>
    where
        P: AsRef<Path>,
    {
        let module = crate::ts::parser::parse_module(mod_path.as_ref())
            .expect(&format!("could not load module: {:?}", mod_path.as_ref()));

        crate::ts::parser::get_exported_functions(&module.body)
    }

    fn get_exports(&mut self, mod_name: &str) -> Option<Vec<String>> {
        if let Some(module) = self.ts_modules.get_mut(mod_name) {
            if let Some(exports) = module.exports.clone() {
                Some(exports)
            } else {
                let exports = Self::exported_functions(&module.path);
                module.exports = Some(exports.clone());
                Some(exports)
            }
        } else {
            None
        }
    }

    fn gen_func(&mut self, mod_name: &str, mat_data: FuncMatData) {
        if let Some(exports) = self.get_exports(mod_name) {
            println!("exports {:?}", exports);
            // TODO: generate missing functions
        }
    }
}

/* utils */
trait IntoJson {
    fn into_json(self) -> Value;
}

impl IntoJson for HashMap<String, Value> {
    fn into_json(self) -> Value {
        let mut map = serde_json::Map::with_capacity(self.len());
        for (k, v) in self {
            map.insert(k, v);
        }
        Value::Object(map)
    }
}
