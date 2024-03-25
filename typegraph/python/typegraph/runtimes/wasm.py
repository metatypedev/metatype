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
    RuntimeId,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils import get_file_hash
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
        enable_mdk = False
        return gen_wasm(self.id, enable_mdk, inp, out, func, wasm, effect)

    def from_mdk(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        op_name: str,
        wasm: str,
        effect: Optional[Effect] = None,
    ):
        enable_mdk = True
        return gen_wasm(self.id, enable_mdk, inp, out, op_name, wasm, effect)


def gen_wasm(
    runtime_id: RuntimeId,
    enable_mdk: bool,
    inp: "t.struct",
    out: "t.typedef",
    op_name: str,
    wasm: str,
    effect: Optional[Effect] = None,
):
    effect = effect or EffectRead()
    artifact_hash = get_file_hash(wasm)
    wasm = f"file:{wasm}"

    mat_id = runtimes.from_wasm_module(
        store,
        BaseMaterializer(runtime=runtime_id, effect=effect),
        MaterializerWasm(
            module=wasm,
            func_name=op_name,
            artifact_hash=artifact_hash,
            mdk_enabled=enable_mdk,
        ),
    )

    if isinstance(mat_id, Err):
        raise Exception(mat_id.value)

    return t.func(
        inp,
        out,
        WasmMat(id=mat_id.value, module=wasm, func_name=op_name, effect=effect),
    )


@dataclass
class WasmMat(Materializer):
    module: str
    func_name: str
    effect: List[str]
