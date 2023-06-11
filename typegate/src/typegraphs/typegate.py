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
        PureFunMat("(_args, { context }) => context.username === 'admin'")
    ).named("admin_only")

    g.expose(
        typegraphs=t.func(t.struct({}), t.array(typegraph), TypeGraphsMat()).rate(
            calls=True
        ),
        typegraph=t.func(
            t.struct({"name": t.string()}),
            t.optional(typegraph.compose({"serialized": serialized})),
            TypeGraphMat(),
        ).rate(calls=True),
        addTypegraph=t.func(
            t.struct(
                {"fromString": t.json(), "secrets": t.json(), "cliVersion": t.string()}
            ),
            t.struct(
                {
                    "name": t.string(),
                    "messages": t.array(
                        t.struct(
                            {
                                "type": t.enum(["info", "warning", "error"]),
                                "text": t.string(),
                            }
                        )
                    ),
                    "migrations": t.array(
                        t.struct(
                            {
                                "runtime": t.string(),
                                "migrations": t.string(),
                            }
                        )
                    ),
                    "resetRequired": t.array(t.string()),
                }
            ),
            AddTypeGraphMat(),
        ).rate(calls=True),
        removeTypegraph=t.func(
            t.struct({"name": t.string()}), t.integer(), RemoveTypeGraphMat()
        ).rate(calls=True),
        default_policy=admin_only,
    )
