# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def test(g: Graph):
    deno = DenoRuntime()
    public_policy = Policy.public()

    inp = t.struct({"a": t.integer(name="arg1")}, name="inp")
    out = t.struct({"a": t.integer()}, name="out")

    test = deno.func(
        inp,
        out,
        code="""
            ({ a }: { a: number; }) => {
                return {
                    a
                };
            }

        """,
    ).with_policy(public_policy)

    g.expose(test=test)
