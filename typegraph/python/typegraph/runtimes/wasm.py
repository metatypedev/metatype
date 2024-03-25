# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import List, Optional

from typegraph import t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    EffectRead,
    MaterializerWasm,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


class WasmRuntime(Runtime):
    def __init__(self):
        super().__init__(runtimes.register_wasm_runtime(store))

    def from_wasm(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        func: str,
        wasm: str,
        effect: Optional[Effect] = None,
    ):
        effect = effect or EffectRead()
        wasm = f"file:{wasm}"

        mat_id = runtimes.from_wasm_module(
            store,
            BaseMaterializer(runtime=self.id.value, effect=effect),
            MaterializerWasm(module=wasm, func_name=func),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            inp,
            out,
            WasmMat(id=mat_id.value, module=wasm, func_name=func, effect=effect),
        )


@dataclass
class WasmMat(Materializer):
    module: str
    func_name: str
    effect: List[str]
