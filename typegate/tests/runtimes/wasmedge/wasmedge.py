from typegraph import TypeGraph, policies, t
from typegraph.runtimes.wasmedge import WasmEdgeRuntime

with TypeGraph("wasmedge") as g:
    public = policies.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            "rust.wasm",
            "add",
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
        ),
        default_policy=[public],
    )
