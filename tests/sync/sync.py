# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph, Policy, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def sync(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        hello=deno.import_(
            t.struct({"name": t.string()}),
            t.string(),
            name="hello",
            module="scripts/hello.ts",
            secrets=["ULTRA_SECRET"],
        ).with_policy(public)
    )
