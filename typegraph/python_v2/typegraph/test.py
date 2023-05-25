# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, TypeGraph


with TypeGraph(name="test") as g:
    a = t.integer()
    b = t.integer(min=12)
    c = t.integer(min=12, max=43)

    print(a)
    print(b)
    print(c)
    print(c.min, c.max)

    s1 = t.struct(
        {
            "a": a,
            "b": t.integer(),
        }
    )
    print(s1)

    f = t.func(s1, a)
    print(f)

    g.expose(
        one=t.func(s1, a),
    )
