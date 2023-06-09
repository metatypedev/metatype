# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, TypeGraph

a = t.integer()

s1 = t.struct({"a": a, "b": t.integer(min=12)})

c = t.integer(min=12, max=43)

user = t.struct({"id": t.integer(), "post": t.ref("Post")}, name="User")

post = t.struct({"id": t.integer(), "user": t.ref("User")}, name="Post")

with TypeGraph(name="test-types") as g:
    g.expose(one=t.func(s1, c), two=t.func(user, post))
