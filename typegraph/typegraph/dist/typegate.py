from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import worker
from typegraph.materializers.deno import AddTypeGraphMat
from typegraph.materializers.deno import RemoveTypeGraphMat
from typegraph.materializers.deno import TypeGraphMat
from typegraph.materializers.deno import TypeGraphsMat
from typegraph.materializers.deno import TypeNodeMat
from typegraph.types import typedefs as t

with TypeGraph("typegate") as g:

    typenode = t.struct(
        {
            "idx": t.integer(),
            "name": t.string(),
            "typedef": t.string(),
            "edges": t.list(t.integer()),
            "data": t.string(),
        }
    ).named("typenode")

    typegraph = t.struct(
        {
            "name": t.string(),
            "url": t.uri(),
            "rootType": typenode,
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
        typenode=t.func(
            t.struct({"typegraphName": t.string(), "idx": t.integer()}),
            t.optional(typenode),
            TypeNodeMat(),
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
