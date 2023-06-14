# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, TypeGraph
from typegraph.runtimes.deno import DenoRuntime

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

c = t.integer(min=12, max=43)

user = t.struct({"id": t.integer(), "post": t.ref("Post")}, name="User")

post = t.struct({"id": t.integer(), "user": t.ref("User")}, name="Post")

with TypeGraph(name="test-types") as g:
    g.expose(
        one=DenoRuntime.func(s1, c, code="() => 12"),
        two=DenoRuntime.func(user, post, code="() => ({ id: 12, user: { id: 13 } })"),
    )
