// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use anyhow::bail;
use anyhow::Result;
use std::collections::HashSet;
use std::path::Path;
use swc_common::errors::{ColorConfig, Handler};
use swc_common::hygiene::Mark;
use swc_common::sync::Lrc;
use swc_common::FileName;
use swc_common::Globals;
use swc_common::SourceMap;
use swc_common::DUMMY_SP;
use swc_common::GLOBALS;
use swc_ecma_ast::*;
use swc_ecma_transforms::typescript::strip::strip;
use swc_ecmascript::parser::parse_file_as_module;
use swc_ecmascript::parser::parse_file_as_script;
use swc_ecmascript::{
    codegen,
    codegen::{text_writer::JsWriter, Emitter},
    parser::Syntax,
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
        src: Box::new(Str {
            span: DUMMY_SP,
            value: source.into(),
            raw: Default::default(),
        }),
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
        function: Box::new(Function {
            params: vec![Param {
                span: DUMMY_SP,
                decorators: vec![],
                pat: Pat::Ident(BindingIdent {
                    id: Ident::new("arg".into(), DUMMY_SP),
                    type_ann: Some(Box::new(tpe(inp))),
                }),
            }],
            decorators: vec![],
            span: DUMMY_SP,
            body,
            is_generator: false,
            is_async: false,
            type_params: None,
            return_type: Some(Box::new(tpe(out))),
        }),
    };
    ExportDecl {
        decl: Decl::Fn(f),
        span: DUMMY_SP,
    }
}

pub struct MyVisitor {
    pub source: String,
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
                span: _,
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
                function,
            }) if ident.sym.to_string() == "apply" => {
                println!("TEST {:?}", function.params);
            }
            _ => (),
        }
        n
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

    let mut errors = vec![];
    parse_file_as_module(
        &fm,
        Syntax::Typescript(Default::default()),
        EsVersion::latest(),
        None,
        &mut errors,
    )
    .or_else(|e| {
        e.into_diagnostic(&handler).emit();
        bail!("could not compile module")
    })
}

pub fn parse_module_source(source: String) -> Result<Module> {
    let cm: Lrc<SourceMap> = Default::default();
    let handler = Handler::with_tty_emitter(ColorConfig::Auto, true, false, Some(cm.clone()));

    let fm = cm.new_source_file(FileName::Anon, source);

    let mut errors = vec![];
    parse_file_as_module(
        &fm,
        Syntax::Typescript(Default::default()),
        EsVersion::latest(),
        None,
        &mut errors,
    )
    .or_else(|e| {
        e.into_diagnostic(&handler).emit();
        bail!("could not compile module")
    })
}

pub fn transform_module(module: Module) -> Result<String> {
    let globals = Globals::default();
    let module = GLOBALS.set(&globals, || {
        let top_level_mark = Mark::new();
        module.fold_with(&mut strip(top_level_mark))
    });

    with_emitter(|emitter| {
        emitter.emit_module(&module).map_or_else(
            |e| bail!("error while emitting module code: {e}"),
            |_| Ok(()),
        )
    })
}

pub fn transform_script(source: String) -> Result<String> {
    let cm: Lrc<SourceMap> = Default::default();
    let handler = Handler::with_tty_emitter(ColorConfig::Auto, true, false, Some(cm.clone()));
    let fm = cm.new_source_file(FileName::Anon, source);

    let mut errors = vec![];
    let script = parse_file_as_script(
        &fm,
        Syntax::Typescript(Default::default()),
        EsVersion::latest(),
        None,
        &mut errors,
    )
    .or_else(|e| {
        e.into_diagnostic(&handler).emit();
        bail!("could not compile script")
    })?;

    for e in errors {
        e.into_diagnostic(&handler).emit();
    }

    let globals = Globals::default();
    let script = GLOBALS.set(&globals, || {
        let top_level_mark = Mark::new();
        script.fold_with(&mut strip(top_level_mark))
    });

    with_emitter(|emitter| {
        emitter.emit_script(&script).map_or_else(
            |e| bail!("error while emitting script code: {e}"),
            |_| Ok(()),
        )
    })
}

pub fn get_exported_functions(mod_body: &Vec<ModuleItem>) -> HashSet<String> {
    let mut res = HashSet::default();
    for mod_item in mod_body {
        match mod_item {
            ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(decl)) => {
                if let Decl::Fn(fn_decl) = &decl.decl {
                    assert!(res.insert(fn_decl.ident.sym.to_string()));
                }
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(decl)) => {
                if let DefaultDecl::Fn(_) = &decl.decl {
                    assert!(res.insert("default".to_string()));
                }
            }
            _ => (),
        }
    }

    res
}

fn with_emitter<'a, C>(emit: C) -> Result<String>
where
    C: FnOnce(&mut Emitter<'a, JsWriter<&mut Vec<u8>>, SourceMap>) -> Result<()>,
{
    let cm: Lrc<SourceMap> = Default::default();
    let mut buf = vec![];
    let mut emitter = Emitter {
        cfg: codegen::Config {
            target: EsVersion::latest(),
            ascii_only: false,
            minify: true,
            omit_last_semi: false,
        },
        cm: cm.clone(),
        comments: None,
        wr: JsWriter::new(cm, "", &mut buf, None),
    };

    emit(&mut emitter)?;

    Ok(String::from_utf8_lossy(&buf).to_string())
}
