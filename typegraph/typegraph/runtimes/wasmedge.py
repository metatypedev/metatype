# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


import base64

from attrs import frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


@frozen
class WasmEdgeRuntime(Runtime):
    """Runs Wasm functions on the WasmEdge runtime.

    **Experimental**
    """

    runtime_name: str = always("wasmedge")

    def data(self, collector):
        return {
            **super().data(collector),
        }

    def wasi(
        self,
        wasm_file: str,
        func: str,
        inp,
        out,
        effect: Effect = effects.none(),
        **kwargs
    ):
        with open(wasm_file, "rb") as f:
            wasm = base64.b64encode(f.read()).decode("utf-8")

        return t.func(
            inp,
            out,
            WASIMat(self, wasm, func, effect=effect, **kwargs),
        )


@frozen
class WASIMat(Materializer):
    runtime: Runtime
    wasm: str
    func: str
    effect: Effect = required()
    materializer_name: str = always("wasi")
