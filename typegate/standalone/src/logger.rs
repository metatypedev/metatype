// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use colored::Colorize;
use log::Level;
use std::io::Write;

fn optional_module_path(path: &str) -> String {
    if path.starts_with("typegate") {
        "".to_string()
    } else {
        format!(" {path}")
    }
}

pub fn init() {
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var(
            "RUST_LOG",
            "info,quaint=off,swc_ecma_codegen=off,tracing::span=off",
        );
    }
    let mut builder = env_logger::Builder::from_default_env();
    builder
        .format(|buf, rec| {
            let level = rec.level();
            let module_path = rec.module_path().unwrap_or("");
            let level = match level {
                Level::Error => {
                    format!("[{level}{p}]", p = optional_module_path(module_path)).red()
                }
                Level::Warn => {
                    format!("[{level}{p}]", p = optional_module_path(module_path)).yellow()
                }
                Level::Info => {
                    format!("[{level}{p}]", p = optional_module_path(module_path)).blue()
                }
                Level::Debug => format!("[{level} {module_path}]").dimmed(),
                Level::Trace => format!("[{level} {module_path}]").dimmed(),
            };

            let text = format!("{}", rec.args());
            let mut lines = text.lines();
            if let Some(first_line) = lines.next() {
                writeln!(buf, "{level} {first_line}")?;
            }
            for line in lines {
                if !line.is_empty() {
                    writeln!(buf, "{level}> {line}")?;
                }
            }
            Ok(())
        })
        .init();
}
