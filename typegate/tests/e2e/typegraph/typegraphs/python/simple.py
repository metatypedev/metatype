# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph, Policy, Graph
from typegraph.runtimes.deno import DenoRuntime

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

b = t.integer(min=12, max=43)


@typegraph()
def test_types(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    internal = Policy.internal()

    user = t.struct({"id": t.integer(), "post": g.ref("Post")}, name="User")
    post = t.struct({"id": t.integer(), "author": g.ref("User")}, name="Post")

    g.expose(
        one=deno.func(s1, b, code="() => 12").with_policy(internal),
        two=deno.func(user, post, code="(user) => ({ id: 12, user })").with_policy(
            deno.policy("deny", "() => false")
        ),
        three=deno.import_(s1, s1, name="three", module="scripts/three.ts").with_policy(
            public
        ),
    )
