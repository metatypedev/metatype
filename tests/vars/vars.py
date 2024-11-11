# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def vars(g: Graph):
    deno = DenoRuntime()

    g.expose(
        add=deno.func(
            t.struct(
                {
                    "first": t.integer(),
                    "second": t.integer(),
                },
            ),
            t.integer(),
            code="({ first, second }) => first + second",
        ).with_policy(Policy.public()),
        sum=deno.func(
            t.struct({"numbers": t.list(t.integer())}),
            t.integer(),
            code="({ numbers }) => numbers.reduce((a, b) => a + b, 0)",
        ).with_policy(Policy.public()),
        level2=deno.func(
            t.struct(
                {"level1": t.struct({"level2": t.list(t.string())}, name="Level1")},
            ),
            t.string(),
            code="(arg) => arg.level1.level2[0]",
        ).with_policy(Policy.public()),
    )
