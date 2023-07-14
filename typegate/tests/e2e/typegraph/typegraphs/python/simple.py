# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph_next import g, t, typegraph
from typegraph_next.runtimes.deno import DenoRuntime

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

b = t.integer(min=12, max=43)

user = t.struct({"id": t.integer(), "post": t.ref("Post")}, name="User")

post = t.struct({"id": t.integer(), "author": t.ref("User")}, name="Post")

with typegraph(name="test-types") as expose:
    deno = DenoRuntime()
    public = g.Policy.public()
    internal = g.Policy.internal()

    expose(
        one=deno.func(s1, b, code="() => 12").with_policy(internal),
        two=deno.func(user, post, code="(user) => ({ id: 12, user })").with_policy(
            deno.policy("deny", "() => false")
        ),
        three=deno.import_(s1, s1, name="three", module="scripts/three.ts").with_policy(
            public
        ),
    )
