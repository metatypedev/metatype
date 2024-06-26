// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::runtimes as wit;

#[derive(Debug)]
pub enum WasmMaterializer {
    ReflectedFunc(wit::MaterializerWasmReflectedFunc),
    WireHandler(wit::MaterializerWasmWireHandler),
}
