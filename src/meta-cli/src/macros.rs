// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// Conversion that preserves source chain
// but not backtraces.
// This can be made a funciton but we have to
// depend on anyhow directly to be able to refer
// to it's Error type.
// https://github.com/eyre-rs/eyre/issues/31
#[macro_export]
macro_rules! anyhow_to_eyre {
    () => {
        |err| {
            eyre::format_err!(Box::<dyn std::error::Error + Send + Sync + 'static>::from(
                err
            ))
        }
    };
}

#[macro_export]
macro_rules! map_ferr {
    () => {
        |err| eyre::format_err!(err)
    };
}
