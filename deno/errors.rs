// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.

//! There are many types of errors in Deno:
//! - AnyError: a generic wrapper that can encapsulate any type of error.
//! - JsError: a container for the error message and stack trace for exceptions
//!   thrown in JavaScript code. We use this to pretty-print stack traces.
//! - Diagnostic: these are errors that originate in TypeScript's compiler.
//!   They're similar to JsError, in that they have line numbers. But
//!   Diagnostics are compile-time type errors, whereas JsErrors are runtime
//!   exceptions.
use deno_ast::Diagnostic;
use deno_core::error::AnyError;
use deno_graph::ModuleError;
use deno_graph::ModuleGraphError;
use deno_graph::ResolutionError;
use import_map::ImportMapError;
use std::fmt::Write;

fn get_import_map_error_class(_: &ImportMapError) -> &'static str {
    "URIError"
}

fn get_diagnostic_class(_: &Diagnostic) -> &'static str {
    "SyntaxError"
}

fn get_module_graph_error_class(err: &ModuleGraphError) -> &'static str {
    match err {
        ModuleGraphError::ModuleError(err) => match err {
            ModuleError::LoadingErr(_, _, err) => get_error_class_name(err.as_ref()),
            ModuleError::InvalidTypeAssertion { .. } => "SyntaxError",
            ModuleError::ParseErr(_, diagnostic) => get_diagnostic_class(diagnostic),
            ModuleError::UnsupportedMediaType { .. }
            | ModuleError::UnsupportedImportAttributeType { .. } => "TypeError",
            ModuleError::Missing(_, _)
            | ModuleError::MissingDynamic(_, _)
            | ModuleError::UnknownPackage { .. }
            | ModuleError::UnknownPackageReq { .. } => "NotFound",
        },
        ModuleGraphError::ResolutionError(err) => get_resolution_error_class(err),
    }
}

fn get_resolution_error_class(err: &ResolutionError) -> &'static str {
    match err {
        ResolutionError::ResolverError { error, .. } => {
            get_error_class_name(&AnyError::new(error.clone()))
        }
        _ => "TypeError",
    }
}

pub fn get_error_class_name(e: &AnyError) -> &'static str {
    deno_runtime::errors::get_error_class_name(e)
        .or_else(|| {
            e.downcast_ref::<ImportMapError>()
                .map(get_import_map_error_class)
        })
        .or_else(|| e.downcast_ref::<Diagnostic>().map(get_diagnostic_class))
        .or_else(|| {
            e.downcast_ref::<ModuleGraphError>()
                .map(get_module_graph_error_class)
        })
        .or_else(|| {
            e.downcast_ref::<ResolutionError>()
                .map(get_resolution_error_class)
        })
        .unwrap_or_else(|| {
            if cfg!(debug) {
                log::warn!(
                    "Error '{}' contains boxed error of unknown type:{}",
                    e,
                    e.chain().fold(String::new(), |mut output, e| {
                        let _ = write!(output, "\n  {e:?}");
                        output
                    })
                );
            }
            "Error"
        })
}
