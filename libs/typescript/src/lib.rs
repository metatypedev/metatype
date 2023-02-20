// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod parser;

pub use dprint_plugin_typescript as dprint_plugin;
pub use string_cache;
pub use swc_common;
use swc_common::sync::Lrc;
use swc_common::SourceMap;
pub use swc_ecma_ast as ast;
use swc_ecma_ast::{EsVersion, Module};

use anyhow::Result;
use dprint_plugin::configuration::Configuration;
use lazy_static::lazy_static;
use std::{env, io::Write, path::Path};
use swc_ecma_codegen::{text_writer::JsWriter, Config, Emitter};

lazy_static! {
    static ref TS_FORMAT_CONFIG: Configuration = {
        use dprint_plugin_typescript::configuration::*;
        ConfigurationBuilder::new()
            .line_width(80)
            .prefer_hanging(true)
            .prefer_single_line(false)
            .next_control_flow_position(NextControlFlowPosition::SameLine)
            .union_and_intersection_type_prefer_hanging(false)
            .union_and_intersection_type_prefer_single_line(false)
            .build()
    };
}

pub fn format_text<P: AsRef<Path>>(path: P, source: &str) -> Result<String> {
    Ok(dprint_plugin::format_text(path.as_ref(), source, &TS_FORMAT_CONFIG)?.unwrap())
}

pub fn print_module<W: Write>(cm: Lrc<SourceMap>, module: &Module, writer: W) -> Result<()> {
    // ref: https://doc.rust-lang.org/std/env/consts/constant.OS.html
    let new_line = match env::consts::OS {
        "windows" => "\r\n", // windows := CR LF
        _ => "\n",           // UNIX or MAC := LF
    };
    let mut emitter = Emitter {
        cfg: Config {
            target: EsVersion::latest(),
            ascii_only: true,
            minify: false,
            omit_last_semi: true,
        },
        cm: cm.clone(),
        comments: None,
        wr: JsWriter::new(cm, new_line, writer, None),
    };

    emitter.emit_module(module)?;

    Ok(())
}
