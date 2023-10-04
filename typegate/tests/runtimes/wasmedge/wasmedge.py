from typegraph import t, typegraph
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasmedge import WasmEdgeRuntime


@typegraph()
def wasmedge(g: Graph):
    pub = Policy.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="rust.wasm",
            func="add",
        ).with_policy(pub),
    )
