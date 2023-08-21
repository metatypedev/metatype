from typegraph_next import t, typegraph
from typegraph_next.graph.typegraph import Graph
from typegraph_next.policy import Policy
from typegraph_next.runtimes.wasmedge import WasmEdgeRuntime


@typegraph()
def test_complex_types(g: Graph):
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
