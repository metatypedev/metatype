from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("class_syntax") as g:

    class Comment(t.struct):
        title = t.string().min(2).max(20)
        content = t.string()

    class Post(t.struct):
        id = t.string()
        title = t.string().min(2).max(20).optional()
        content = t.string()
        likes = t.integer().min(0).optional()
        comments = t.array(Comment()).named("Comments")

    # # mix
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
            # Note:
            # by default, X() ~ a struct of name "X"
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
