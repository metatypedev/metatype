// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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

// should this only added on debug build?
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
