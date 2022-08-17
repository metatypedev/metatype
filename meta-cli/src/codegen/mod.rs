use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::str::FromStr;

use crate::typegraph::Typegraph;

#[derive(Serialize, Deserialize, Debug)]
struct FuncData {
    materializer: u32,
    input: u32,
    output: u32,
}

#[derive(Serialize, Deserialize, Debug)]
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
    exports: RefCell<Option<HashSet<String>>>, // names of exported functions
}

struct Codegen {
    path: PathBuf,
    base_dir: PathBuf,
    tg: Typegraph,
    ts_modules: HashMap<String, ModuleInfo>,
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
                                exports: RefCell::new(None), // lazy
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
            tg,
            ts_modules,
        }
    }

    fn apply(&self) {
        let mut gen_list = vec![];

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
                if let Some(mod_name) = mat_data.import_from.as_ref() {
                    if self.ts_modules.contains_key(mod_name) && mat_data.import_from.is_some() {
                        if self.check_func(&mat_data) {
                            gen_list.push(mat_data);
                        }
                    }
                }
            }
        }

        let gen_list = gen_list;
        println!("gen list {gen_list:?}");
    }

    fn exported_functions<P>(mod_path: P) -> HashSet<String>
    where
        P: AsRef<Path>,
    {
        let module = crate::ts::parser::parse_module(mod_path.as_ref())
            .expect(&format!("could not load module: {:?}", mod_path.as_ref()));

        crate::ts::parser::get_exported_functions(&module.body)
    }

    /// Returns `true` if the function with the given materializer should be generated.
    fn check_func(&self, mat_data: &FuncMatData) -> bool {
        if let Some(mod_name) = mat_data.import_from.as_ref() {
            if let Some(module) = self.ts_modules.get(mod_name) {
                if module.exports.borrow().is_some() {
                    let exports = module.exports.borrow();
                    let exports = exports.as_ref().unwrap();
                    !exports.contains(&mat_data.name)
                } else {
                    let exports = Self::exported_functions(&module.path);
                    let ret = !exports.contains(&mat_data.name);
                    *module.exports.borrow_mut() = Some(exports);
                    ret
                }
            } else {
                false
            }
        } else {
            false
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
