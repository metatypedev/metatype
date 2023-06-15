# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph
from typegraph.runtimes.deno import DenoRuntime

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

b = t.integer(min=12, max=43)

user = t.struct({"id": t.integer(), "post": t.ref("Post")}, name="User")

post = t.struct({"id": t.integer(), "author": t.ref("User")}, name="Post")

with typegraph(name="test-types") as g:
    g.expose(
        one=DenoRuntime.func(s1, b, code="() => 12"),
        two=DenoRuntime.func(user, post, code="(user) => ({ id: 12, user })"),
        three=DenoRuntime.import_(s1, s1, name="three", module="scripts/three.ts"),
    )
