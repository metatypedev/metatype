use crate::cli::dev::collect_typegraphs;
use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use crate::typegraph::{TypeNode, Typegraph};

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
    let cg = Codegen::new(tg_json, base_dir);
    cg.apply().expect("could not apply codegen");
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

    fn apply(&self) -> Result<()> {
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
                            gen_list.push((func_data, mat_data));
                        }
                    }
                }
            }
        }

        // group by modules
        let gen_list = gen_list;
        let cgs = self.generate(gen_list);

        for (mod_name, codegen) in cgs.into_iter() {
            let module = self.ts_modules.get(&mod_name).unwrap();
            let mut file = File::options()
                .append(true)
                .open(&module.path)
                .context(format!("could not open output file: {:?}", module.path))?;
            write!(file, "\n{codegen}\n")?;
        }

        Ok(())
    }

    fn generate(&self, gen_list: Vec<(FuncData, FuncMatData)>) -> HashMap<String, String> {
        let mut map: HashMap<String, Vec<Result<String>>> = HashMap::default();
        for (fn_data, mat_data) in gen_list.iter() {
            map.entry(mat_data.import_from.clone().unwrap())
                .and_modify(|l| l.push(self.gen_func(fn_data, mat_data)))
                .or_insert_with(|| vec![self.gen_func(fn_data, mat_data)]);
        }

        let map = map
            .into_iter()
            .map(|(k, v)| (k, v.into_iter().collect::<Result<Vec<String>>>()))
            .collect::<HashMap<_, _>>();

        let mut cgs: HashMap<String, String> = HashMap::default();
        for (k, v) in map.into_iter() {
            cgs.insert(k, v.expect("could not generate code").join("\n\n"));
        }

        cgs
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

    fn gen_interface(&self, name: &str, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        Ok(format!("interface {name} {}\n", self.gen_obj_type(tpe)?))
    }

    fn gen_obj_type(&self, tpe: &TypeNode) -> Result<String> {
        let fields = tpe.get_struct_fields()?;
        let fields = fields
            .iter()
            .map(|(k, v)| (k.clone(), self.get_typespec(*v).unwrap()))
            .collect::<HashMap<_, _>>();
        let mut typedef = "{\n".to_string();
        for (k, v) in fields.iter() {
            typedef.push_str(&format!("  {k}: {v};\n"));
        }
        typedef.push_str("}");
        Ok(typedef)
    }

    fn destructure_object(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        let fields = tpe.get_struct_fields()?;
        Ok(format!(
            "{{ {} }}",
            fields
                .keys()
                .map(|k| k.clone())
                .collect::<Vec<_>>()
                .join(", "),
        ))
    }

    fn gen_default_value(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        match &tpe.typedef {
            t if t == "optional" => Ok("null".to_string()),
            t if t == "list" => Ok("[]".to_string()),
            t if t == "boolean" => Ok("false".to_string()),
            t if t == "integer" || t == "unsigned_integer" || t == "float" => Ok("0".to_string()),
            t if t == "string" => Ok("\"\"".to_string()),
            t if t == "struct" => {
                let fields = tpe.get_struct_fields()?;
                let body = fields
                    .iter()
                    .map(|(k, v)| -> Result<String> {
                        Ok(format!("{k}: {}", self.gen_default_value(*v)?))
                    })
                    .collect::<Result<Vec<_>>>()?
                    .join(", ");
                Ok(format!("{{ {body} }}"))
            }
            _ => Err(anyhow!("unsupported type \"{}\"", tpe.typedef)),
        }
    }

    fn gen_func(&self, fn_data: &FuncData, mat_data: &FuncMatData) -> Result<String> {
        // input type
        let inp_type_name = {
            let mut name = mat_data.name.clone();
            let (lead, _) = name.split_at_mut(1);
            lead.make_ascii_uppercase();
            name.push_str("Input");
            name
        };
        // let inp_type = &self.tg.types[fn_data.input as usize];
        let inp_typedef = self
            .gen_interface(&inp_type_name, fn_data.input)
            .context("failed to generate input type")?;

        let out_typespec = self
            .get_typespec(fn_data.output)
            .context("failed to generate output type")?;

        let code = format!(
            "{}\nexport function {}({}: {}): {} {{\n  return {};\n}}",
            inp_typedef,
            mat_data.name,
            self.destructure_object(fn_data.input)?,
            inp_type_name,
            out_typespec,
            self.gen_default_value(fn_data.output)?,
        );

        // TODO: format code
        Ok(code)
    }

    fn get_typespec(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        match &tpe.typedef {
            t if t == "optional" => {
                let of = tpe.data.get("of").ok_or(anyhow!(
                    "invalid type data for optional: field \"of\" is undefined"
                ))?;
                let of: u32 = serde_json::from_value(of.clone())?;
                Ok(format!("null | {}", self.get_typespec(of)?))
            }
            t if t == "list" => {
                let of = tpe.data.get("of").ok_or(anyhow!(
                    "invalid type data for list: field \"of\" is undefined"
                ))?;
                let of: u32 = serde_json::from_value(of.clone())?;
                Ok(format!("Array<{}>", self.get_typespec(of)?))
            }
            t if t == "boolean" => Ok("boolean".to_string()),
            t if t == "integer" || t == "unsigned_integer" || t == "float" => {
                Ok("number".to_string())
            }
            t if t == "string" => Ok("string".to_string()),
            t if t == "struct" => self.gen_obj_type(tpe),
            _ => Err(anyhow!("unsupported type {}", tpe.typedef)),
        }
    }
}

/**
 * utils
 **/

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

pub fn apply_for(dir: &str, paths: &Vec<PathBuf>) -> Result<()> {
    let loader = paths
        .iter()
        .map(|p| format!(r#"loaders.import_file("{}")"#, p.to_str().unwrap()))
        .collect::<Vec<_>>()
        .join(" + ");

    println!("loader: {loader}");

    let tgs = collect_typegraphs(dir.to_string(), Some(loader), true)?;
    for tg in tgs.values() {
        apply(tg, dir);
    }

    Ok(())
}
