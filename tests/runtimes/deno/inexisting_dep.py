# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def inexisting_dep(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        doAddition=deno.import_(
            t.struct({"a": t.float(), "b": t.float()}),
            t.float(),
            module="ts/dep/main.ts",
            deps=["ts/dep/nested/dep.ts", "ts/dep/nested/inexisting_dep.ts"],
            name="doAddition",
        ),
    )
