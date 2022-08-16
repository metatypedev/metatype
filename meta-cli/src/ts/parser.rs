use anyhow::Result;
use dprint_plugin_typescript::configuration::*;
use dprint_plugin_typescript::*;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use swc_common::errors::{ColorConfig, Handler};
use swc_common::input::SourceFileInput;
use swc_common::sync::Lrc;
use swc_common::SourceMap;
use swc_common::DUMMY_SP;
use swc_ecma_ast::*;
use swc_ecmascript::{
    codegen,
    codegen::{text_writer::JsWriter, Emitter},
    parser::{lexer::Lexer, Parser, Syntax},
    visit::{Fold, FoldWith},
};

fn named_import(tpe: String, alias: String) -> ImportNamedSpecifier {
    ImportNamedSpecifier {
        local: Ident::new(tpe.into(), DUMMY_SP),
        span: DUMMY_SP,
        imported: Some(ModuleExportName::Ident(Ident::new(alias.into(), DUMMY_SP))),
        is_type_only: false,
    }
}

fn import(specifier: ImportNamedSpecifier, source: &str) -> ImportDecl {
    ImportDecl {
        span: DUMMY_SP,
        specifiers: vec![ImportSpecifier::Named(specifier)],
        src: Str {
            span: DUMMY_SP,
            value: source.into(),
            raw: Default::default(),
        },
        type_only: true,
        asserts: None,
    }
}

fn tpe(name: String) -> TsTypeAnn {
    TsTypeAnn {
        span: DUMMY_SP,
        type_ann: Box::new(TsType::TsTypeRef(TsTypeRef {
            span: DUMMY_SP,
            type_name: TsEntityName::Ident(Ident::new(name.into(), DUMMY_SP)),
            type_params: None,
        })),
    }
}

fn export_function(name: String, inp: String, out: String, body: Option<BlockStmt>) -> ExportDecl {
    let f = FnDecl {
        ident: Ident::new(name.into(), DUMMY_SP),
        declare: false,
        function: Function {
            params: vec![Param {
                span: DUMMY_SP,
                decorators: vec![],
                pat: Pat::Ident(BindingIdent {
                    id: Ident::new("arg".into(), DUMMY_SP),
                    type_ann: Some(tpe(inp)),
                }),
            }],
            decorators: vec![],
            span: DUMMY_SP,
            body: body,
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: Some(tpe(out)),
        },
    };
    ExportDecl {
        decl: Decl::Fn(f),
        span: DUMMY_SP,
    }
}

struct MyVisitor {
    source: String,
    imports: Vec<(String, String)>,
}

impl Fold for MyVisitor {
    fn fold_module(&mut self, n: Module) -> Module {
        let mut rewrite = n
            .body
            .into_iter()
            .filter(|s| match &s {
                ModuleItem::ModuleDecl(ModuleDecl::Import(imp)) => {
                    !(imp.src.value.to_string() == "./output.ts" && imp.type_only)
                }
                _ => true,
            })
            .collect::<Vec<_>>();

        if let Some(idx) = rewrite.iter().position(|s| match &s {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(f),
                ..
            })) => f.ident.sym.to_string() == "apply",
            _ => false,
        }) {
            if let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(ExportDecl {
                decl: Decl::Fn(f),
                span,
            })) = rewrite.swap_remove(idx)
            {
                let new_exp = export_function(
                    "testaaa".to_string(),
                    "Input".to_string(),
                    "Output".to_string(),
                    f.function.body,
                );
                rewrite.push(ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(new_exp)));
            }
        } else {
            let new_exp = export_function(
                "testaaa".to_string(),
                "Input".to_string(),
                "Output".to_string(),
                None,
            );
            rewrite.push(ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(new_exp)));
        }

        for imp in &self.imports {
            let imp = import(named_import(imp.0.clone(), imp.1.clone()), "./output.ts");
            rewrite.push(ModuleItem::ModuleDecl(ModuleDecl::Import(imp)));
        }
        rewrite.rotate_right(self.imports.len());
        Module { body: rewrite, ..n }
    }
    fn fold_export_decl(&mut self, n: ExportDecl) -> ExportDecl {
        match &n.decl {
            Decl::Fn(FnDecl {
                ident,
                declare: _,
                function:
                    Function {
                        params,
                        decorators: _,
                        span,
                        body: _,
                        is_generator: _,
                        is_async,
                        type_params,
                        return_type,
                    },
            }) if ident.sym.to_string() == "apply" => {
                println!("TEST {:?}", params);
            }
            _ => (),
        }
        n
    }
}

pub fn parse(path: &PathBuf) {
    let cm: Lrc<SourceMap> = Default::default();
    let handler = Handler::with_tty_emitter(ColorConfig::Auto, true, false, Some(cm.clone()));

    let fm = cm
        .load_file(path.as_path())
        .expect(&format!("failed to load {:?}", path));
    let lexer = Lexer::new(
        Syntax::Typescript(Default::default()),
        EsVersion::latest(),
        SourceFileInput::from(&*fm),
        None,
    );

    let mut parser = Parser::new_from(lexer);

    for e in parser.take_errors() {
        e.into_diagnostic(&handler).emit();
    }

    let m = parser
        .parse_module()
        .map_err(|e| {
            // Unrecoverable fatal error occurred
            e.into_diagnostic(&handler).emit()
        })
        .expect("failed to parser module");

    let mut v = MyVisitor {
        source: "./output.ts".to_string(),
        imports: vec![
            ("Input".to_string(), "test".to_string()),
            ("Output".to_string(), "test2".to_string()),
        ],
    };

    let n = m.fold_with(&mut v);

    let code = {
        let mut buf = vec![];

        {
            let mut emitter = Emitter {
                cfg: codegen::Config {
                    ..Default::default()
                },
                cm: cm.clone(),
                comments: None,
                wr: JsWriter::new(cm.clone(), "\n", &mut buf, None),
            };

            emitter.emit_module(&n).unwrap();
        }

        String::from_utf8_lossy(&buf).to_string()
    };

    let config = ConfigurationBuilder::new().deno().build();

    // TODO : avoid re-parsing by using dprint/deno ast
    let formatted = format_text(&PathBuf::from("output.ts"), &code, &config);
    println!("{:?}", formatted);
    match formatted {
        Ok(text) => fs::write("output.ts", &text.unwrap()).unwrap(),
        Err(e) => println!("Error: {:?}", e),
    }
}

pub fn parse_module<P>(mod_path: P) -> Result<Module>
where
    P: AsRef<Path>,
{
    let cm: Lrc<SourceMap> = Default::default();
    let handler = Handler::with_tty_emitter(ColorConfig::Auto, true, false, Some(cm.clone()));

    let fm = cm.load_file(mod_path.as_ref())?;
    // .expect(&format!("failed to load file: {:?}", mod_path.as_ref()));

    let lexer = Lexer::new(
        Syntax::Typescript(Default::default()),
        EsVersion::latest(),
        SourceFileInput::from(&*fm),
        None,
    );

    let mut parser = Parser::new_from(lexer);

    for e in parser.take_errors() {
        e.into_diagnostic(&handler).emit();
    }

    let module = parser
        .parse_module()
        .map_err(|e| e.into_diagnostic(&handler).emit())
        .expect("failed to parse module");

    Ok(module)
}

pub fn get_exported_functions(mod_body: &Vec<ModuleItem>) -> Vec<String> {
    let mut res = vec![];
    for mod_item in mod_body {
        match mod_item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(decl)) => match &decl.decl {
                Decl::Fn(fn_decl) => {
                    // println!("fn decl {:?}", fn_decl);
                    res.push(fn_decl.ident.sym.to_string());
                }
                _ => (),
            },
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(decl)) => match &decl.decl {
                DefaultDecl::Fn(_) => res.push("default".to_string()),
                _ => (),
            },
            _ => (),
        }
    }

    res
}
