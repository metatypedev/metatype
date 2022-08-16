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
    let cg = Codegen::new(tg_json, base_dir);
    cg.apply();
}

struct ModuleInfo {
    path: PathBuf,
    exports: Option<Vec<String>>, // names of exported functions
}

struct Codegen {
    tg: Typegraph,
    base_dir: PathBuf,
    ts_modules: HashMap<String, ModuleInfo>,
}

impl Codegen {
    fn new<P>(tg_json: &str, file: P) -> Self
    where
        P: AsRef<Path>,
    {
        let tg: Typegraph = serde_json::from_str(tg_json).expect("invalid typegraph JSON");
        let base_dir = {
            let mut dir = file.as_ref().to_path_buf();
            if !dir.pop() {
                panic!("invalid file path");
            }
            dir
        };

        let ts_modules = {
            let mut modules = HashMap::new();
            for code in tg.codes.iter() {
                if code.typ == "module".to_string() {
                    if let Some(path) = code.source.strip_prefix("file:") {
                        println!("module {path}");
                        modules.insert(
                            code.name.clone(),
                            ModuleInfo {
                                path: PathBuf::from_str(path).unwrap(),
                                exports: Some(vec![]),
                            },
                        );
                    }
                }
            }
            modules
        };
        Codegen {
            tg,
            base_dir,
            ts_modules,
        }
    }

    fn apply(self) {
        for tpe in self.tg.types.iter() {
            if tpe.typedef != "func" && tpe.typedef != "gen" {
                continue;
            }
            let func_data: FuncData = serde_json::from_value(tpe.data.clone().into_json())
                .expect("invalid type data for func");
            let mat = self.tg.materializers[func_data.materializer as usize].clone();
            if mat.name == "function" {
                let mat_data: FuncMatData = serde_json::from_value(mat.data.into_json())
                    .expect("invalid materializer data for function materializer");
                if let Some(mod_name) = mat_data.import_from.clone() {
                    if let Some(module) = self.ts_modules.get(&mod_name) {
                        self.gen_func(&module.path, mat_data);
                    }
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

    fn gen_func<P>(&self, module: P, mat_data: FuncMatData)
    where
        P: AsRef<Path>,
    {
        let exports = Self::exported_functions(module);
        println!("exports {:?}", exports);
        // list exported functions + cache
        // generate missing functions
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
