// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub fn init() {
    static INIT: std::sync::Once = std::sync::Once::new();
    INIT.call_once(|| {
        let (eyre_panic_hook, _eyre_hook) = color_eyre::config::HookBuilder::default()
            .panic_section(format!(
                r#"Metatype has panicked. This is a bug, please report this
at https://github.com/metatypedev/metatype/issues/new.
If you can reliably reproduce this panic, try to include the
following items in your report:
- Reproduction steps 
- Output of meta-cli doctor and
- A panic backtrace. Set the following environment variables as shown to enable full backtraces.
    - RUST_BACKTRACE=1
    - RUST_LIB_BACKTRACE=full
    - RUST_SPANTRACE=1

Platform: {platform}
Version: {version}
Args: {args:?}
"#,
                platform = crate::build::BUILD_TARGET,
                version = crate::build::PKG_VERSION,
                args = std::env::args().collect::<Vec<_>>()
            ))
            .display_location_section(
                std::env::var("RUST_ERR_LOCATION")
                    .map(|var| var != "0")
                    .unwrap_or(true),
            )
            .display_env_section(false)
            .try_into_hooks()
            .unwrap();
        let eyre_panic_hook = eyre_panic_hook.into_panic_hook();
        std::panic::set_hook(Box::new(move |panic_info| {
            eyre_panic_hook(panic_info);
            // - Tokio does not exit the process when a task panics, so we define a custom
            //   panic hook to implement this behaviour.
            std::process::exit(1);
        }));

        // FIXME: for some reason, the tests already have
        // an eyre_hook
        #[cfg(not(test))]
        _eyre_hook.install().unwrap();

        if std::env::var("RUST_LOG").is_err() {
            std::env::set_var("RUST_LOG", "info,actix_server=warn");
        }
        // #[cfg(not(debug_assertions))]
        if std::env::var("RUST_SPANTRACE").is_err() {
            std::env::set_var("RUST_SPANTRACE", "0");
        }

        use tracing_subscriber::prelude::*;

        let fmt = tracing_subscriber::fmt::layer()
            .without_time()
            .with_writer(std::io::stderr)
            // .pretty()
            // .with_file(true)
            // .with_line_number(true)
            .with_target(false);

        #[cfg(test)]
        let fmt = fmt.with_test_writer();

        #[cfg(debug_assertions)]
        let fmt = fmt.with_target(true);

        let filter = tracing_subscriber::EnvFilter::from_default_env();

        tracing_subscriber::registry()
            // filter on values from RUST_LOG
            .with(filter)
            // subscriber that emits to stderr
            .with(fmt)
            // instrument errors with SpanTraces, used by color-eyre
            .with(tracing_error::ErrorLayer::default())
            .init();
    });
}
