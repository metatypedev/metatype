# Copyright Metatype under the Elastic License 2.0.

from typegraph.graphs.typegraph import Auth
from typegraph.graphs.typegraph import Cors
from typegraph.graphs.typegraph import Rate
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.typegate import AddTypeGraphMat
from typegraph.materializers.typegate import RemoveTypeGraphMat
from typegraph.materializers.typegate import SerializedTypegraphMat
from typegraph.materializers.typegate import TypeGraphMat
from typegraph.materializers.typegate import TypeGraphsMat
from typegraph.policies import Policy
from typegraph.types import types as t

with TypeGraph(
    "typegate",
    auths=[Auth.basic(["admin"])],
    cors=Cors(
        allow_origin=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    ),
    rate=Rate(
        window_sec=60,
        window_limit=128,
        query_limit=8,
        local_excess=5,
        context_identifier="user",
    ),
) as g:

    serialized = t.gen(t.string(), SerializedTypegraphMat())

    typegraph = t.struct(
        {
            "name": t.string(),
            "url": t.uri(),
        }
    ).named("typegraph")

    admin_only = Policy(
        FunMat.from_lambda(lambda args: args["user"] == "admin"),
    ).named("admin_only")

    g.expose(
        typegraphs=t.func(t.struct({}), t.array(typegraph), TypeGraphsMat())
        .rate(calls=True)
        .add_policy(admin_only),
        typegraph=t.func(
            t.struct({"name": t.string()}),
            t.optional(typegraph.compose({"serialized": serialized})),
            TypeGraphMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        addTypegraph=t.func(
            t.struct({"fromString": t.string()}),
            typegraph.optional(),
            AddTypeGraphMat(),
        )
        .rate(calls=True)
        .add_policy(admin_only),
        removeTypegraph=t.func(
            t.struct({"name": t.string()}), t.integer(), RemoveTypeGraphMat()
        )
        .rate(calls=True)
        .add_policy(admin_only),
    )
