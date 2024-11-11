# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def deno_no_artifact(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        simple=deno.func(
            t.struct({"a": t.float(), "b": t.float()}),
            t.float(),
            code="({ a, b }) => a + b",
        ),
    )
