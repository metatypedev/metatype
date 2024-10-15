// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::types::runtimes::{MaterializerWasmReflectedFunc, MaterializerWasmWireHandler};

#[derive(Debug)]
pub enum WasmMaterializer {
    ReflectedFunc(MaterializerWasmReflectedFunc),
    WireHandler(MaterializerWasmWireHandler),
}
