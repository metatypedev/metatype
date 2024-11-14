# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasm import WasmRuntime

from typegraph import t, typegraph


@typegraph()
def wasm_reflected(g: Graph):
    pub = Policy.public()
    wasm = WasmRuntime.reflected("rust.wasm")

    g.expose(
        test=wasm.export(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            name="add",
        ).with_policy(pub),
    )
