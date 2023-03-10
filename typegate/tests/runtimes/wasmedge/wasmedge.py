from pathlib import Path

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.wasmedge import WasmEdgeRuntime

this_dir = Path(__file__).parent

with TypeGraph("wasmedge") as g:
    public = policies.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            this_dir.joinpath("rust.wasm"),
            "add",
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
        ),
        default_policy=[public],
    )
