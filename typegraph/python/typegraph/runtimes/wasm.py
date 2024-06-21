# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import Optional

from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    EffectRead,
    WasmRuntimeData,
    MaterializerWasmReflectedFunc,
    MaterializerWasmWireHandler,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store

from typegraph import t


class WasmRuntime(Runtime):
    @staticmethod
    def reflected(module_path: str) -> "WasmRuntimeReflected":
        return WasmRuntimeReflected(artifact_path=module_path)

    @staticmethod
    def wire(module_path: str) -> "WasmRuntimeWire":
        return WasmRuntimeWire(artifact_path=module_path)


@dataclass
class WireWasmMat(Materializer):
    func_name: str


class WasmRuntimeWire(WasmRuntime):
    def __init__(self, artifact_path: str):
        runtime_id = runtimes.register_wasm_wire_runtime(
            store,
            data=WasmRuntimeData(wasm_artifact=artifact_path),
        )
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)

    def handler(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        name: str,
        effect: Optional[Effect] = None,
    ):
        effect = effect or EffectRead()

        mat_id = runtimes.from_wasm_wire_handler(
            store,
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerWasmWireHandler(func_name=name),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            inp,
            out,
            WireWasmMat(id=mat_id.value, func_name=name, effect=effect),
        )


@dataclass
class ReflectedWasmMat(Materializer):
    func_name: str


class WasmRuntimeReflected(WasmRuntime):
    def __init__(self, artifact_path: str):
        runtime_id = runtimes.register_wasm_reflected_runtime(
            store,
            data=WasmRuntimeData(wasm_artifact=artifact_path),
        )
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)

    def export(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        name: str,
        effect: Optional[Effect] = None,
    ):
        effect = effect or EffectRead()

        mat_id = runtimes.from_wasm_reflected_func(
            store,
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerWasmReflectedFunc(func_name=name),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            inp,
            out,
            ReflectedWasmMat(id=mat_id.value, func_name=name, effect=effect),
        )
