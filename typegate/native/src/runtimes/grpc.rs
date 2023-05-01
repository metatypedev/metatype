// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use macros::deno;

// imports

#[deno]
struct GrpcInput {
    proto: String,
    method: String,
    args: Vec<String>,
}

// helpers

#[deno]
enum GrpcOutput {
    Ok { res: String },
    Err { message: String },
}

#[deno]
fn call_grpc_method(_input: GrpcInput) -> GrpcOutput {
    GrpcOutput::Ok {
        res: String::from("Hello Metatype"),
    }
}
