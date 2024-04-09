from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasm import WasmRuntime

from typegraph import t, typegraph


@typegraph()
def wasm_py(g: Graph):
    pub = Policy.public()
    wasm = WasmRuntime()

    g.expose(
        test=wasm.from_wasm(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="rust.wasm",
            func="add",
        ).with_policy(pub),
    )
