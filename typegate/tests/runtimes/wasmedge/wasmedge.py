from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasmedge import WasmEdgeRuntime

from typegraph import t, typegraph


@typegraph()
def wasmedge(g: Graph):
    pub = Policy.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="artifacts/rust.wasm",
            func="add",
        ).with_policy(pub),
    )
