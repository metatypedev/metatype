// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod parser;

pub use dprint_plugin_typescript as dprint_plugin;
pub use string_cache;
pub use swc_common;
pub use swc_ecma_ast as ast;
pub use swc_ecmascript::*;

use anyhow::Result;
use dprint_plugin::configuration::Configuration;
use lazy_static::lazy_static;
use std::path::Path;

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
