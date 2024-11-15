# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.wasm import WasmRuntime

from typegraph import t, typegraph


@typegraph()
def wasm_wire(g: Graph):
    wasm = WasmRuntime.wire("rust.wasm")

    g.expose(
        Policy.public(),
        test=wasm.handler(
            t.struct({"a": t.float(), "b": t.float()}).rename("add_args"),
            t.integer(),
            name="add",
        ).rename("add"),
    )
