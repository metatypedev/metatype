// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use colored::Colorize;
use log::Level;
use std::io::Write;

pub fn init() {
    if std::env::var("RUST_LOG").is_err() {
        #[cfg(debug_assertions)]
        std::env::set_var("RUST_LOG", "info,meta=trace");
        #[cfg(not(debug_assertions))]
        std::env::set_var("RUST_LOG", "info");
    }
    let mut builder = env_logger::Builder::from_default_env();
    builder
        .format(|buf, rec| {
            let level = rec.level();
            let module_path = rec.module_path().unwrap_or("");
            let level = match level {
                Level::Error => format!("[{level}]").red(),
                Level::Warn => format!("[{level}]").yellow(),
                Level::Info => format!("[{level}]").blue(),
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
