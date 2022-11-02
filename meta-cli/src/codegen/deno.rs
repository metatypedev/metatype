// Copyright Metatype under the Elastic License 2.0.

use anyhow::{bail, Context, Result};
use common::typegraph::{TypeNode, Typegraph};
use dprint_plugin_typescript::{configuration::Configuration, format_text};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::fmt::Write as _;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};

lazy_static! {
    static ref TS_FORMAT_CONFIG: Configuration = {
        use dprint_plugin_typescript::configuration::*;
        ConfigurationBuilder::new()
            .line_width(80)
            .prefer_hanging(true)
            .prefer_single_line(false)
            .quote_style(QuoteStyle::PreferSingle)
            .next_control_flow_position(NextControlFlowPosition::SameLine)
            .build()
    };
}

#[derive(Serialize, Deserialize, Debug)]
struct ImportFuncMatData {
    serial: bool,
    name: String,
    #[serde(rename = "mod")]
    module: u32,
}

#[derive(Serialize, Deserialize, Debug)]
struct ModuleMatData {
    code: String,
}

pub fn codegen<P>(tg: Typegraph, base_dir: P) -> Result<()>
where
    P: AsRef<Path>,
{
    let cg = Codegen::new(&tg, base_dir);
    let codes = cg.codegen()?;
    for code in codes.into_iter() {
        let mut file = File::options()
            .append(true)
            .open(&code.path)
            .context(format!("could not open output file: {:?}", code.path))?;
        write!(file, "\n{code}\n", code = code.code)?;
    }
    Ok(())
}

struct ModuleCode {
    path: PathBuf,
    code: String,
}

struct ModuleInfo {
    path: PathBuf,
    exports: RefCell<Option<HashSet<String>>>, // names of exported functions
}

struct GenItem {
    input: u32,
    output: u32,
    path: String,
    name: String,
}

struct Codegen<'a> {
    path: PathBuf,
    base_dir: PathBuf,
    tg: &'a Typegraph,
    ts_modules: HashMap<String, ModuleInfo>,
}

impl<'a> Codegen<'a> {
    // TODO: accept Typegraph instance
    fn new<P>(tg: &'a Typegraph, path: P) -> Self
    where
        P: AsRef<Path>,
    {
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
            for mat in tg.materializers.iter() {
                let runtime = &tg.runtimes[mat.runtime as usize];
                if &runtime.name != "deno" && &runtime.name != "worker" {
                    continue;
                }
                if mat.name != "module" {
                    continue;
                }
                let code: String =
                    serde_json::from_value(mat.data.get("code").unwrap().clone()).unwrap();
                if let Some(relpath) = code.strip_prefix("file:") {
                    println!("module: {relpath}");
                    let path = {
                        let mut path = base_dir.clone();
                        path.push(relpath);
                        path
                    };
                    modules.insert(
                        relpath.to_string(),
                        ModuleInfo {
                            path,
                            exports: RefCell::new(None), // lazy
                        },
                    );
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

    fn codegen(mut self) -> Result<Vec<ModuleCode>> {
        let mut gen_list = vec![];

        for tpe in self.tg.types.iter() {
            if let TypeNode::Function {
                materializer,
                input,
                output,
                base,
                ..
            } = tpe
            {
                let mat = self.tg.materializers[*materializer as usize].clone();
                let runtime = &self.tg.runtimes[base.runtime as usize];
                if runtime.name != "deno" && runtime.name != "worker" {
                    continue;
                }
                if mat.name == "import_function" {
                    let mat_data: ImportFuncMatData = serde_json::from_value(mat.data.into_json())
                        .expect("invalid materializer data for function materializer");
                    let module_mat = &self.tg.materializers[mat_data.module as usize];
                    let path: String =
                        serde_json::from_value(module_mat.data.get("code").unwrap().clone())
                            .unwrap();
                    if let Some(path) = path.strip_prefix("file:") {
                        if self.ts_modules.contains_key(path)
                            && self.check_func(path, &mat_data.name)
                        {
                            gen_list.push(GenItem {
                                input: *input,
                                output: *output,
                                path: self
                                    .ts_modules
                                    .get(path)
                                    .unwrap()
                                    .path
                                    .to_str()
                                    .unwrap()
                                    .to_string(),
                                name: mat_data.name.clone(),
                            });
                        }
                    }
                }
            }
        }

        // group by modules
        let gen_list = gen_list;
        let module_codes = self.generate(gen_list);
        Ok(module_codes
            .into_iter()
            .map(|(name, code)| {
                let path = self.ts_modules.remove(&name).unwrap().path;
                let code = format_text(&path, &code, &TS_FORMAT_CONFIG)
                    .expect("could not format code")
                    .unwrap();
                ModuleCode { path, code }
            })
            .collect())
    }

    fn generate(&self, gen_list: Vec<GenItem>) -> HashMap<String, String> {
        let mut map: HashMap<String, Vec<Result<String>>> = HashMap::default();
        for GenItem {
            input,
            output,
            path,
            name,
        } in gen_list.into_iter()
        {
            map.entry(path)
                .and_modify(|l| l.push(self.gen_func(input, output, &name)))
                .or_insert_with(|| vec![self.gen_func(input, output, &name)]);
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
        if !mod_path.as_ref().exists() {
            return HashSet::new();
        }
        let module = crate::ts::parser::parse_module(mod_path.as_ref())
            .unwrap_or_else(|_| panic!("could not load module: {:?}", mod_path.as_ref()));

        crate::ts::parser::get_exported_functions(&module.body)
    }

    /// Returns `true` if the function named `name` should be generated in the specified file.
    fn check_func(&self, path: &str, name: &str) -> bool {
        if let Some(module) = self.ts_modules.get(path) {
            if module.exports.borrow().is_some() {
                let exports = module.exports.borrow();
                let exports = exports.as_ref().unwrap();
                !exports.contains(name)
            } else {
                let exports = Self::exported_functions(&module.path);
                let ret = !exports.contains(name);
                *module.exports.borrow_mut() = Some(exports);
                ret
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
        #[cfg(test)]
        let fields = fields
            .into_iter()
            .collect::<std::collections::BTreeMap<_, _>>();
        let mut typedef = "{\n".to_string();
        for (k, v) in fields.iter() {
            writeln!(typedef, "  {k}: {v};")?;
        }
        typedef.push('}');
        Ok(typedef)
    }

    fn destructure_object(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        let fields = tpe.get_struct_fields()?;
        #[cfg(test)]
        let fields = fields
            .into_iter()
            .collect::<std::collections::BTreeMap<_, _>>();
        Ok(format!(
            "{{ {} }}",
            fields.keys().cloned().collect::<Vec<_>>().join(", "),
        ))
    }

    fn gen_default_value(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];
        match tpe {
            TypeNode::Optional { .. } => Ok("null".to_owned()),
            TypeNode::Array { .. } => Ok("[]".to_owned()),
            TypeNode::Boolean { .. } => Ok("false".to_owned()),
            TypeNode::Number { .. } | TypeNode::Integer { .. } => Ok("0".to_owned()),
            TypeNode::String { .. } => Ok("\"\"".to_owned()),
            TypeNode::Object { properties, .. } => {
                let props = properties.clone();
                #[cfg(test)]
                let props = props
                    .into_iter()
                    .collect::<std::collections::BTreeMap<_, _>>();
                let body = props
                    .iter()
                    .map(|(k, v)| -> Result<String> {
                        Ok(format!("{k}: {}", self.gen_default_value(*v)?))
                    })
                    .collect::<Result<Vec<_>>>()?
                    .join(", ");
                Ok(format!("{{ {body} }}"))
            }
            _ => bail!("unsupported type"),
        }
    }

    fn gen_func(&self, input: u32, output: u32, name: &str) -> Result<String> {
        // input type
        let inp_type_name = {
            let mut name = name.to_string();
            let (lead, _) = name.split_at_mut(1);
            lead.make_ascii_uppercase();
            name.push_str("Input");
            name
        };
        // let inp_type = &self.tg.types[fn_data.input as usize];
        let inp_typedef = self
            .gen_interface(&inp_type_name, input)
            .context("failed to generate input type")?;

        let out_typespec = self
            .get_typespec(output)
            .context("failed to generate output type")?;

        let code = format!(
            "{}\nexport function {}({}: {}): {} {{\n  return {};\n}}",
            inp_typedef,
            name,
            self.destructure_object(input)?,
            inp_type_name,
            out_typespec,
            self.gen_default_value(output)?,
        );

        // TODO: format code
        Ok(code)
    }

    fn get_typespec(&self, idx: u32) -> Result<String> {
        let tpe = &self.tg.types[idx as usize];

        match tpe {
            TypeNode::Optional { item, .. } => Ok(format!("null | {}", self.get_typespec(*item)?)),
            TypeNode::Array { items, .. } => Ok(format!("Array<{}>", self.get_typespec(*items)?)),
            TypeNode::Boolean { .. } => Ok("boolean".to_owned()),
            TypeNode::Number { .. } | TypeNode::Integer { .. } => Ok("number".to_owned()),
            TypeNode::String { .. } => Ok("string".to_owned()),
            TypeNode::Object { .. } => self.gen_obj_type(tpe),
            _ => bail!("unsupported type"),
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tests::utils::ensure_venv;
    use crate::typegraph::{TypegraphLoader, UniqueTypegraph};
    use std::io::Read;

    #[test]
    fn codegen() -> Result<()> {
        ensure_venv()?;
        let tg = TypegraphLoader::new()
            .skip_deno_modules()
            .load_file("./src/tests/typegraphs/codegen.py")?
            .get_unique()?;
        let module_codes = Codegen::new(&tg, "./src/tests/typegraphs/codegen.py").codegen()?;
        assert_eq!(module_codes.len(), 1);

        let expected_output_path = "./src/tests/typegraphs/codegen-expected-output.ts";
        let expected_output = {
            let mut t = String::new();
            std::fs::File::open(expected_output_path)?.read_to_string(&mut t)?;
            t
        };

        let formatted_code = format_text(
            &Path::new(expected_output_path),
            &expected_output,
            &TS_FORMAT_CONFIG,
        )?;
        let formatted_code = formatted_code.as_ref().unwrap_or(&expected_output);
        assert_eq!(&module_codes[0].code, formatted_code);
        Ok(())
    }
}
