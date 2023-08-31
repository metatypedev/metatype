# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import List, Optional

from typegraph_next.runtimes.base import Materializer, Runtime

from typegraph_next.gen.exports.runtimes import (
    Effect,
    EffectNone,
    BaseMaterializer,
    MaterializerWasi,
)
from typegraph_next.gen.types import Err
from typegraph_next.wit import runtimes, store

from typegraph_next import t


class WasmEdgeRuntime(Runtime):
    def __init__(self):
        super().__init__(runtimes.register_wasmedge_runtime(store))

    def wasi(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        func: str,
        wasm: str,
        effect: Optional[Effect] = None,
    ):
        effect = effect or EffectNone()
        wasm = f"file:{wasm}"

        mat_id = runtimes.from_wasi_module(
            store,
            BaseMaterializer(runtime=self.id.value, effect=effect),
            MaterializerWasi(module=wasm, func_name=func),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            inp,
            out,
            WasiMat(id=mat_id.value, module=wasm, func_name=func, effect=effect),
        )


@dataclass
class WasiMat(Materializer):
    module: str
    func_name: str
    effect: List[str]
