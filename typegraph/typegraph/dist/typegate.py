from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import worker
from typegraph.materializers.deno import AddTypeGraphMat
from typegraph.materializers.deno import RemoveTypeGraphMat
from typegraph.materializers.deno import TypeGraphMat
from typegraph.materializers.deno import TypeGraphsMat
from typegraph.types import typedefs as t

with TypeGraph("typegate") as g:

    typegraph = t.struct(
        {
            "name": t.string(),
            "url": t.uri(),
        }
    ).named("typegraph")

    allow_all = t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(lambda args: True),
            "policy",
        ),
    ).named("__allow_all")

    g.expose(
        typegraphs=t.func(t.struct({}), t.list(typegraph), TypeGraphsMat()).add_policy(
            allow_all
        ),
        typegraph=t.func(
            t.struct({"name": t.string()}), t.optional(typegraph), TypeGraphMat()
        ).add_policy(allow_all),
        addTypegraph=t.func(
            t.struct({"fromString": t.string()}),
            typegraph.s_optional(),
            AddTypeGraphMat(),
        ).add_policy(allow_all),
        removeTypegraph=t.func(
            t.struct({"name": t.string()}), t.integer(), RemoveTypeGraphMat()
        ).add_policy(allow_all),
    )
