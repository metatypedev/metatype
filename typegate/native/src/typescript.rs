// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::path::Path;

use log::error;
use macros::{deno, deno_sync};

#[deno]
struct FormatCodeInp {
    source: String,
}

#[deno]
enum FormatCodeOut {
    Ok { formatted_code: String },
    Err { message: String },
}

#[deno_sync]
fn typescript_format_code(input: FormatCodeInp) -> FormatCodeOut {
    match typescript::format_text(Path::new("code.ts"), &input.source) {
        Ok(formatted_code) => FormatCodeOut::Ok { formatted_code },
        Err(e) => {
            error!("{e:?}");
            FormatCodeOut::Err {
                message: format!("{e:?}"),
            }
        }
    }
}
