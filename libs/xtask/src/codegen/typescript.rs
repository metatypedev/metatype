// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::{anyhow, bail, Context, Result};
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};
use std::{env, fs};
use typescript::ast::*;
use typescript::codegen;
use typescript::parser::parse_module_source;
use typescript::string_cache::Atom;
use typescript::swc_common::{sync::Lrc, SourceMap, DUMMY_SP};

pub fn run() -> Result<()> {
    println!("Generating TypeScript type definitions for typegraph...");

    let jsonschema_path =
        &env::var("TG_JSONSCHEMA_OUT").context("TG_JSONSCHEMA_OUT env variable required")?;

    let path = &env::var("TG_TYPESCRIPT_OUT")
        .context("Reading codegen out file from env variable")
        .context("TG_TYPESCRIPT_OUT env variable required")?;
    let path = Path::new(path);

    let p = Command::new("pnpm")
        .args([
            "dlx",
            "github:metatypedev/json-schema-to-typescript#feat/boolean-schemas-pnpm",
            jsonschema_path,
            "--no-additionalProperties",
            "--booleanSchemas",
        ])
        .stderr(Stdio::inherit())
        .output()
        .context("Executing command script from json-schema-to-typescript")?;

    if !p.status.success() {
        bail!("Generation of TypeScript type definitions from jsonschema failed.");
    }

    fs::create_dir_all(
        path.parent()
            .ok_or_else(|| anyhow!("{path:?} does not have a parent directory"))?,
    )
    .context("Creating directory")?;

    let code = String::from_utf8(p.stdout)
        .context("Parsing json-schema-to-typescript output into a string")?;

    let (module, cm) = parse_module_source(code)
        .context("Parsing typescript file generated by json-schema-to-typescript")?;

    let (idx, variants) = find_union_type(&module, "TypeNode")?
        .ok_or_else(|| anyhow!("Could not find union type 'TypeNode'"))?;

    let exports = variants
        .into_iter()
        .map(|v| -> Result<_> {
            let name = get_type_node_name(&v)?;
            Ok((
                ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export_type(v, &name))),
                name,
            ))
        })
        .collect::<Result<Vec<_>>>()?;

    let (mut exports, names): (Vec<_>, Vec<_>) = exports.into_iter().unzip();

    exports.push(ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(
        export_union_type(&names),
    )));

    let mut module = module;
    module.body.splice(idx..=idx, exports);
    let mut buffer = vec![];
    print_module(cm, &module, &mut buffer)?;

    let code = typescript::format_text(path, std::str::from_utf8(&buffer)?)?;

    let license_header =
        fs::read_to_string(project_root::get_project_root()?.join("dev/license-header.txt"))?;
    let lint_ignore_directive = "deno-lint-ignore-file no-explicit-any";

    println!("Writing at {path:?}");
    let mut file = fs::File::options()
        .write(true)
        .create(true)
        .open(path)
        .with_context(|| format!("Opening output file {path:?}"))?;

    file.set_len(0)?;
    write!(
        file,
        "// {license_header}\n// {lint_ignore_directive}\n\n{code}"
    )
    .with_context(|| format!("Writing to output file {path:?}"))?;
    println!("  > written at {:?}", path.canonicalize()?);

    Ok(())
}

fn print_module<W: Write>(cm: Lrc<SourceMap>, module: &Module, writer: W) -> Result<()> {
    let mut emitter = codegen::Emitter {
        cfg: codegen::Config {
            target: EsVersion::latest(),
            ascii_only: true,
            minify: false,
            omit_last_semi: true,
        },
        cm: cm.clone(),
        comments: None,
        // TODO different new_line for OSes?
        wr: codegen::text_writer::JsWriter::new(cm, "\n", writer, None),
    };

    emitter.emit_module(module)?;

    Ok(())
}

/// Find the exported union type with name `name` and return a clone of its variants
#[allow(clippy::vec_box)]
fn find_union_type(module: &Module, name: &str) -> Result<Option<(usize, Vec<Box<TsType>>)>> {
    let found = module
        .body
        .iter()
        .enumerate()
        .filter_map(|(idx, item)| match item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                span: _,
                decl: Decl::TsTypeAlias(t),
            })) => {
                //
                if &t.id.sym == name {
                    Some((idx, t.type_ann.as_ref()))
                } else {
                    None
                }
            }
            _ => None,
        })
        .collect::<Vec<_>>();

    if found.len() > 1 {
        bail!("Found more than one items named '{name}'");
    }

    if let Some((idx, type_ann)) = found.into_iter().next() {
        match type_ann {
            TsType::TsUnionOrIntersectionType(TsUnionOrIntersectionType::TsUnionType(
                TsUnionType { span: _, types },
            )) => Ok(Some((idx, types.clone()))),
            _ => Ok(None),
        }
    } else {
        Ok(None)
    }
}

fn export_type(typ: Box<TsType>, name: &str) -> ExportDecl {
    ExportDecl {
        span: DUMMY_SP,
        decl: Decl::TsTypeAlias(Box::new(TsTypeAliasDecl {
            span: DUMMY_SP,
            declare: false,
            id: Ident {
                span: DUMMY_SP,
                sym: Atom::from(name),
                optional: false,
            },
            type_params: None,
            type_ann: typ,
        })),
    }
}

fn export_union_type(names: &[String]) -> ExportDecl {
    ExportDecl {
        span: DUMMY_SP,
        decl: Decl::TsTypeAlias(Box::new(TsTypeAliasDecl {
            span: DUMMY_SP,
            declare: false,
            id: Ident::new(Atom::from("TypeNode"), DUMMY_SP),
            type_params: None,
            type_ann: Box::new(TsType::TsUnionOrIntersectionType(
                TsUnionOrIntersectionType::TsUnionType(TsUnionType {
                    span: DUMMY_SP,
                    types: names
                        .iter()
                        .map(|n| {
                            Box::new(TsType::TsTypeRef(TsTypeRef {
                                span: DUMMY_SP,
                                type_name: TsEntityName::Ident(Ident {
                                    span: DUMMY_SP,
                                    sym: Atom::from(n.as_str()),
                                    optional: false,
                                }),
                                type_params: None,
                            }))
                        })
                        .collect::<Vec<_>>(),
                }),
            )),
        })),
    }
}

fn get_type_node_name(t: &TsType) -> Result<String> {
    match t {
        TsType::TsTypeLit(t) => {
            let s = t
                .members
                .iter()
                .filter_map(|e| match e {
                    TsTypeElement::TsPropertySignature(s) => {
                        let TsPropertySignature { key, type_ann, .. } = s;
                        let key = match key.as_ref() {
                            Expr::Ident(i) => Some((*i.sym).to_owned()),
                            _ => None,
                        };
                        key.filter(|k| k == "type").map(|_| type_ann)
                    }
                    _ => None,
                })
                .flatten()
                .collect::<Vec<_>>();

            if s.len() > 1 {
                bail!("Found more than one 'type' property")
            }
            let name = s
                .into_iter()
                .next()
                .ok_or_else(|| anyhow!("Could not found 'type' property in {t:?}"))?;

            let mut name = match name.type_ann.as_ref() {
                TsType::TsLitType(TsLitType {
                    span: _,
                    lit: TsLit::Str(s),
                }) => s.value.as_ref().to_owned(),
                _ => bail!("Expected a literal string, got {name:?}"),
            };
            if let Some(c) = name.get_mut(0..1) {
                c.make_ascii_uppercase();
            }
            name.push_str("Node");
            Ok(name)
        }
        _ => bail!("Expected a type literal for {t:?}"),
    }
}
