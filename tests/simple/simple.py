# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def simple(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    rec = deno.func(
        t.struct({"nested": t.struct({"arg": t.integer()}, name="Nested")}),
        t.integer(),
        code="(args) => args.nested && args.nested.arg",
    )

    g.expose(
        rec=rec.with_policy(public),
        test=deno.identity(
            t.struct({"a": t.integer(name="arg1")}, name="inp"),
        )
        .rename("f")
        .with_policy(public),
    )
