from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasm import WasmRuntime

from typegraph import t, typegraph


@typegraph()
def wasm_duplicate(g: Graph):
    pub = Policy.public()
    wasm1 = WasmRuntime.reflected("rust.wasm")
    wasm2 = WasmRuntime.reflected("rust.wasm")

    g.expose(
        test1=wasm1.from_export(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            func="add",
        ).with_policy(pub),
        test2=wasm2.from_export(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            func="add",
        ).with_policy(pub),
    )
