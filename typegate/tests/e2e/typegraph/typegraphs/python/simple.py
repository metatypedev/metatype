# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph_next import t, typegraph, Policy, G
from typegraph_next.runtimes.deno import DenoRuntime

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

b = t.integer(min=12, max=43)

user = t.struct({"id": t.integer(), "post": t.ref("Post")}, name="User")

post = t.struct({"id": t.integer(), "author": t.ref("User")}, name="Post")


@typegraph
def test_types(g: G):
    deno = DenoRuntime()
    public = Policy.public()
    internal = Policy.internal()

    g.expose(
        one=deno.func(s1, b, code="() => 12").with_policy(internal),
        two=deno.func(user, post, code="(user) => ({ id: 12, user })").with_policy(
            deno.policy("deny", "() => false")
        ),
        three=deno.import_(s1, s1, name="three", module="scripts/three.ts").with_policy(
            public
        ),
    )
