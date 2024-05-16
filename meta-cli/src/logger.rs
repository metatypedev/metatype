// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

pub fn init() -> Result<()> {
    color_eyre::install()?;
    if std::env::var("RUST_LOG").is_err() {
        std::env::set_var("RUST_LOG", "info");
    }
    #[cfg(not(debug_assertions))]
    if std::env::var("RUST_SPANTRACE").is_err() {
        std::env::set_var("RUST_SPANTRACE", "0");
    }

    use tracing_subscriber::prelude::*;
    tracing_subscriber::registry()
        // filter on values from RUST_LOG
        .with(tracing_subscriber::EnvFilter::from_default_env())
        // subscriber that emits to stderr
        .with(
            tracing_subscriber::fmt::layer()
                .without_time()
                .with_writer(std::io::stderr)
                // .pretty()
                // .with_file(true)
                // .with_line_number(true)
                .with_target(false),
        )
        // instrument errors with SpanTraces, used by color-eyre
        .with(tracing_error::ErrorLayer::default())
        .try_init()?;
    Ok(())
}
