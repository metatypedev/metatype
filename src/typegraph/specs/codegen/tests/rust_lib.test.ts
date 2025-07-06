// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "jsr:@std/assert";
import RustLibCodeGenerator from "../src/lib/rust_lib.ts";
import * as utils from "./utils.ts";

Deno.test("Rust type alias codegen", () => {
  const rustcg = new RustLibCodeGenerator();

  rustcg.process(utils.typeAliasCase);

  const result = rustcg.formatTypeDefs();
  const expected = "pub type Foo = Bar;";

  assertEquals(result, expected);
});

Deno.test("Rust struct codegen", () => {
  const rustcg = new RustLibCodeGenerator();

  rustcg.process(utils.recordCase);

  const result = rustcg.formatTypeDefs();
  const expected = `#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordLike {
    pub num: u32,
    pub key: String,
    pub str_arr: Vec<String>,
    pub tup: (NotNan<f64>, NotNan<f64>),
    pub opt: Option<bool>,
    pub comp: Option<Vec<(u32, Something)>>,
}`;

  assertEquals(result, expected);
});

Deno.test("Rust enum codegen", () => {
  const rustcg = new RustLibCodeGenerator();

  rustcg.process(utils.unionCase);

  const result = rustcg.formatTypeDefs();
  const expected = `#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EnumLike {
    Simple,
    Composite(Something),
    SnakeCase(bool),
}`;

  assertEquals(result, expected);
});

Deno.test("Rust function codegen", () => {
  const rustcg = new RustLibCodeGenerator();

  rustcg.process(utils.funcCase);

  const result = rustcg.formatFuncDefs();
  const expected = `pub trait Handler {
    fn func(param: String, opt: Option<bool>) -> Result<u32, super::Error>;
}`;

  assertEquals(result, expected);
});

Deno.test("Rust import codegen", () => {
  const rustcg = new RustLibCodeGenerator();

  rustcg.process(utils.importCase);

  const result = rustcg.formatHeaders();
  const expected = `use super::foobar::{Foo, Bar};
use serde::{Deserialize, Serialize};
#[allow(unused)] use ordered_float::NotNan;`;

  assertEquals(result, expected);
});
