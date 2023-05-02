from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("class_syntax") as g:

    class Comment(t.struct):
        title = t.string()
        content = t.string()

    class Post(t.struct):
        id = t.string()
        title = t.string().min(2).max(20)
        content = t.string()
        likes = t.integer().min(0)
        comments = t.array(Comment()).named("Comments")

    # # mix
    # class A:
    #     a = t.string()
    # # struct > class
    # B = t.struct({"b": t.string(), "class": A()}).named("B")

    # # class > struct
    # class C:
    #     c = t.struct({"any": t.string()}).named("struct")

    g.expose(
        identity=t.func(
            # Note:
            # by default, X() ~ a struct of name "X"
            Post().named("In"),
            Post().named("Out"),
            PredefinedFunMat("identity"),
        ),
        # id_class_struct=t.func(
        #     B.named("BIn"),
        #     B.named("BOut"),
        #     PredefinedFunMat("identity")
        # ),
        # id_struct_class=t.func(
        #     C().named("CIn"),
        #     C().named("COut"),
        #     PredefinedFunMat("identity")
        # ),
        default_policy=[policies.public()],
    )
