// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;

use std::{fs::File, io::Read};

use anyhow::Result;
use rustpython_parser::{ast, Parse};

#[rustfmt::skip]
use deno_core as deno_core;

fn read_file(path: &str) -> Result<String> {
    let mut output = String::new();
    let mut file = File::open(path)?;
    file.read_to_string(&mut output)?;
    Ok(output)
}

#[deno_core::op2(fast)]
pub fn op_validate(#[string] input: String) -> Result<(), OpErr> {
    let python_source = read_file(&input)?;
    ast::Suite::parse(&python_source, "<embedded>").map_err(OpErr::map())?;
    Ok(())
}
