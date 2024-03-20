# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import List, Optional

from typegraph import t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    EffectRead,
    MaterializerWasi,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils import get_file_hash
from typegraph.wit import runtimes, store


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
        effect = effect or EffectRead()
        artifact_hash = get_file_hash(wasm)
        wasm = f"file:{wasm}"

        mat_id = runtimes.from_wasi_module(
            store,
            BaseMaterializer(runtime=self.id.value, effect=effect),
            MaterializerWasi(module=wasm, func_name=func, artifact_hash=artifact_hash),
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
