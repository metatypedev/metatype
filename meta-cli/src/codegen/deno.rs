// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{bail, Context, Result};
use common::typegraph::{TypeNode, Typegraph};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::fmt::Write as _;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use typescript as ts;

#[derive(Serialize, Deserialize, Debug)]
struct ImportFuncMatData {
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
        let parent_folder = Path::new(&code.path).parent().unwrap();
        fs::create_dir_all(parent_folder).unwrap();

        let mut file = File::options()
            .create(true)
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

#[derive(Debug)]
struct ModuleInfo {
    path: PathBuf,
    exports: RefCell<Option<HashSet<String>>>, // names of exported functions
}

#[derive(Debug)]
struct GenItem {
    input: u32,
    output: u32,
    path: String,
    name: String,
}

pub struct Codegen<'a> {
    pub path: PathBuf,
    pub base_dir: PathBuf,
    tg: &'a Typegraph,
    ts_modules: HashMap<String, ModuleInfo>,
}

impl<'a> Codegen<'a> {
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
                    let mat_data: ImportFuncMatData =
                        serde_json::from_value(serde_json::to_value(mat.data)?)
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
        self.generate(gen_list)
            .into_iter()
            .map(|(name, code)| -> Result<ModuleCode> {
                let path = self.ts_modules.remove(&name).unwrap().path;
                let code = ts::format_text(&path, &code)
                    .context(format!("could not format code: {code:#?}"))?;
                Ok(ModuleCode { path, code })
            })
            .collect::<Result<Vec<_>>>()
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
            let functions = map.entry(path).or_default();
            functions.push(self.gen_func(input, output, &name));
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
        let module = ts::parser::parse_module(mod_path.as_ref())
            .unwrap_or_else(|_| panic!("could not load module: {:?}", mod_path.as_ref()));

        ts::parser::get_exported_functions(&module.body)
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

    fn gen_union_type_definition(&self, any_of: &[u32]) -> Result<String> {
        let mut variant_definitions = Vec::new();
        for &variant_type_index in any_of {
            let variant_type_definition = self
                .get_typespec(variant_type_index)
                .expect("type definition generation for variant type should be supported");
            variant_definitions.push(variant_type_definition);
        }
        // field `anyOf` in JSON Schema can be represented in TypeScript
        // as a union of all the variant types
        let intersection_type = variant_definitions.join(" | ");
        Ok(intersection_type)
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
            TypeNode::Union { any_of, .. } => {
                // a type cannot be all the variants, as they might be a
                // disjoint union, therefore by returning the default value of
                // one variant would be enought
                let variant_type_index = any_of
                    .clone()
                    .pop()
                    .expect("the union type should have at least one variant of type nodes");
                self.gen_default_value(variant_type_index)
            }
            _ => bail!("unsupported type: {tpe:#?}"),
        }
    }

    fn gen_func(&self, input: u32, output: u32, name: &str) -> Result<String> {
        let type_name = {
            let mut name = name.to_string();
            let (lead, _) = name.split_at_mut(1);
            lead.make_ascii_uppercase();
            name
        };

        // input type
        let inp_type_name = format!("{type_name}Input");

        // let inp_type = &self.tg.types[fn_data.input as usize];
        let inp_typedef = self
            .gen_interface(&inp_type_name, input)
            .context("failed to generate input type")?;

        let output_type_node = &self.tg.types[output as usize];

        // variable helper in case out_typespec is an interface
        let mut output_type_definition: Option<String> = None;

        // for type definitions that are too long use interfaces/types
        // to avoid cluttering the function definition
        let out_typespec = {
            const LENGTH_LIMIT: usize = 35;
            let output_type_name = format!("{type_name}Output");

            match output_type_node {
                TypeNode::Union { .. } => {
                    let type_definition = self
                        .get_typespec(output)
                        .context("failed to generate type definition")?;

                    if type_definition.len() > LENGTH_LIMIT {
                        output_type_definition =
                            Some(format!("type {output_type_name} = {type_definition}\n"));
                        output_type_name
                    } else {
                        type_definition
                    }
                }
                _ => self
                    .get_typespec(output)
                    .context("failed to generate output type")?,
            }
        };

        let code = format!(
            "{}\n{}\nexport function {}({}: {}, {{ context }}: {{ context: Record<string, unknown> }}): {} {{\n  return {};\n}}",
            inp_typedef,
			output_type_definition.unwrap_or_default(),
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
            TypeNode::String { base, .. } => {
                if let Some(variants) = &base.enumeration {
                    let variants: Vec<String> = variants
                        .iter()
                        .map(|variant| {
                            let variant = variant
                                .as_str()
                                .expect("each variant of a string enum should be a string");

                            format!("\"{variant}\"")
                        })
                        .collect();

                    let enum_definition = variants.join(" | ");
                    Ok(enum_definition)
                } else {
                    Ok("string".to_owned())
                }
            }
            TypeNode::Object { .. } => self.gen_obj_type(tpe),
            TypeNode::Union { any_of, .. } => self.gen_union_type_definition(any_of),
            _ => bail!("unsupported type: {tpe:#?}"),
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
    use crate::config::Config;
    use crate::tests::utils::ensure_venv;
    use crate::typegraph::TypegraphLoader;

    #[test]
    fn codegen() -> Result<()> {
        ensure_venv()?;
        let test_folder = Path::new("./src/tests/typegraphs");
        let tests = fs::read_dir(test_folder).unwrap();
        let config = Config::default_in(test_folder);

        for typegraph_test in tests {
            let typegraph_test = typegraph_test.unwrap().path();
            let tgs = TypegraphLoader::with_config(&config)
                .skip_deno_modules()
                .load_file(&typegraph_test)?
                .unwrap_or_else(|| vec![]);
            assert_eq!(tgs.len(), 1);
            let tg = tgs.into_iter().next().unwrap();
            let module_codes = Codegen::new(&tg, &typegraph_test).codegen()?;
            assert_eq!(module_codes.len(), 1);

            let test_name = typegraph_test.to_string_lossy().to_string();
            insta::assert_snapshot!(test_name, &module_codes[0].code);
        }

        Ok(())
    }
}
