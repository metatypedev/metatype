// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{
    errors::Result,
    global_store::Store,
    types::{
        core::{MaterializerId, RuntimeId},
        runtimes::{
            BaseMaterializer, MaterializerWasmReflectedFunc, MaterializerWasmWireHandler,
            WasmRuntimeData,
        },
    },
};

use super::{Materializer, Runtime};

#[derive(Debug)]
pub enum WasmMaterializer {
    ReflectedFunc(MaterializerWasmReflectedFunc),
    WireHandler(MaterializerWasmWireHandler),
}

pub fn register_wasm_reflected_runtime(data: WasmRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::WasmReflected(data.into())))
}

pub fn register_wasm_wire_runtime(data: WasmRuntimeData) -> Result<RuntimeId> {
    Ok(Store::register_runtime(Runtime::WasmWire(data.into())))
}

pub fn from_wasm_reflected_func(
    base: BaseMaterializer,
    data: MaterializerWasmReflectedFunc,
) -> Result<MaterializerId> {
    let mat = Materializer::wasm(
        base.runtime,
        WasmMaterializer::ReflectedFunc(data),
        base.effect,
    );
    Ok(Store::register_materializer(mat))
}

pub fn from_wasm_wire_handler(
    base: BaseMaterializer,
    data: MaterializerWasmWireHandler,
) -> Result<MaterializerId> {
    let mat = Materializer::wasm(
        base.runtime,
        WasmMaterializer::WireHandler(data),
        base.effect,
    );
    Ok(Store::register_materializer(mat))
}
