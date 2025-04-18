# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def class_syntax(g: Graph):
    # class Tag(t.struct):
    #     # name = t.string() # reserved
    tag = t.struct({"name": t.string()})

    class TitledEntity(t.struct):
        title = t.string(min=2, max=20).optional()

    # child class should inherit from parent
    class Info(TitledEntity):
        content = t.string()

    metadata = t.either([tag.rename("Tag"), Info().rename("Info")])

    class Comment(TitledEntity):
        content = t.string()

    class Post(TitledEntity):
        id = t.string()
        content = t.string()
        likes = t.integer(min=0).optional()
        comments = t.list(Comment(), name="Comments")
        metadatas = t.list(metadata).optional()

    # mix
    class A(t.struct):
        a = t.string()

    # struct > class
    B = t.struct({"b": t.string(), "class": A()}, name="B")

    # class > struct
    class C(t.struct):
        c = t.string()
        struct = B  # .named("Bstruct")

    deno = DenoRuntime()

    g.expose(
        Policy.public(),
        identity=deno.identity(Post()),
        id_struct_class=deno.identity(B),
        id_class_struct=deno.identity(C()),
    )
