# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def deno_partial(g: Graph):
    public = Policy.public()

    deno = DenoRuntime()

    g.expose(
        public,
        sum=deno.import_(
            t.struct({"numbers": t.list(t.integer())}),
            t.integer(),
            module="ts/deno.ts",
            name="sum",
        ),
    )
