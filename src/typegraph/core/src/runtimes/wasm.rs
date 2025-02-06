// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::sdk::runtimes as sdk;

#[derive(Debug)]
pub enum WasmMaterializer {
    ReflectedFunc(sdk::MaterializerWasmReflectedFunc),
    WireHandler(sdk::MaterializerWasmWireHandler),
}
