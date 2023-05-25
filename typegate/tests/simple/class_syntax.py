from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("class_syntax") as g:
    # class Tag(t.struct):
    #     # name = t.string() # reserved
    tag = t.struct({"name": t.string()}).named("Tag")

    class TitledEntity(t.struct):
        title = t.string().min(2).max(20).optional()

    # child class should inherit from parent
    class Info(TitledEntity):
        content = t.string()

    metadata = t.either([tag, Info().named("Info")])

    class Comment(TitledEntity):
        content = t.string()

    class Post(TitledEntity):
        id = t.string()
        content = t.string()
        likes = t.integer().min(0).optional()
        comments = t.array(Comment()).named("Comments")
        metadatas = t.array(metadata).optional()

    # mix
    class A(t.struct):
        a = t.string()

    # struct > class
    B = t.struct({"b": t.string(), "class": A()}).named("B")

    # class > struct
    class C(t.struct):
        c = t.string()
        struct = B.named("Bstruct")

    g.expose(
        identity=t.func(
            Post().named("In"),
            Post().named("Out"),
            PredefinedFunMat("identity"),
        ),
        id_struct_class=t.func(
            B.named("BIn"), B.named("BOut"), PredefinedFunMat("identity")
        ),
        id_class_struct=t.func(
            C().named("CIn"), C().named("COut"), PredefinedFunMat("identity")
        ),
        default_policy=[policies.public()],
    )
