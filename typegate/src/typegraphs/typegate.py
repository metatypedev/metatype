# Copyright Metatype under the Elastic License 2.0.

from typegraph import TypeGraph, t
from typegraph.policies import Policy
from typegraph.runtimes.deno import PureFunMat
from typegraph.runtimes.typegate import (
    AddTypeGraphMat,
    RemoveTypeGraphMat,
    SerializedTypegraphMat,
    TypeGraphMat,
    TypeGraphsMat,
)

with TypeGraph(
    "typegate",
    auths=[TypeGraph.Auth.basic(["admin"])],
    cors=TypeGraph.Cors(
        allow_origin=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    ),
    rate=TypeGraph.Rate(
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
        PureFunMat("(_args, { context }) => context.user === 'admin'")
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
            typegraph.compose(
                {
                    "messages": t.array(
                        t.struct(
                            {
                                "type": t.enum(["info", "warning", "error"]),
                                "text": t.string(),
                            }
                        )
                    )
                }
            ).optional(),
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
