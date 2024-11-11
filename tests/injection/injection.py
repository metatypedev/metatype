# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, effects, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.graphql import GraphQLRuntime
from typegraph.effects import CREATE, UPDATE, DELETE, READ


@typegraph()
def injection(g: Graph):
    deno = DenoRuntime()

    req = t.struct(
        {
            "a": t.integer(),
            "raw_int": t.integer().set(1),
            "raw_str": t.string().set("2"),
            "secret": t.integer().from_secret("TEST_VAR"),
            "context": t.string().from_context("userId"),
            "optional_context": t.string().optional().from_context("inexistent"),
            "raw_obj": t.struct({"in": t.integer()}).set({"in": -1}),
            "alt_raw": t.string().set("2"),
            "alt_secret": t.string().from_secret("TEST_VAR"),
            "alt_context": t.string().from_context("userId"),
            # "alt_context_missing": t.string().inject(injection.context("inexistent")), # fail
            "alt_context_opt": t.string().optional().from_context("userId"),
            "alt_context_opt_missing": t.string().optional().from_context("userId"),
            "date": t.datetime().inject("now"),
        }
    )

    operation = t.enum(["insert", "modify", "remove", "read"])

    req2 = t.struct(
        {
            "operation": operation.set(
                {
                    CREATE: "insert",
                    UPDATE: "modify",
                    DELETE: "remove",
                    READ: "read",
                }
            )
        }
    )
    res2 = t.struct({"operation": operation})

    copy = t.struct({"a2": t.integer().from_parent("a")})

    user = t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
            "email": t.email(),
        },
        name="User",
    )

    gql = GraphQLRuntime("https://example.com/api/graphql")

    messages_db = PrismaRuntime("prisma", "POSTGRES")

    message = t.struct(
        {
            "id": t.uuid(as_id=True, config={"auto": True}),
            "time": t.datetime(),
            "text": t.string(),
            "senderId": t.integer(),
            "recipientId": t.integer(),
        },
        name="Messages",
    )

    find_messages = messages_db.find_many(message)

    g.expose(
        Policy.public(),
        test=deno.identity(req).extend(
            {
                "parent": deno.identity(copy),
                "graphql": gql.query(
                    t.struct({"id": t.integer().from_parent("a")}),
                    user,
                    path=("user",),
                ),
            }
        ),
        effect_none=deno.identity(req2),
        effect_create=deno.func(req2, res2, code="(x) => x", effect=effects.create()),
        effect_delete=deno.func(req2, res2, code="(x) => x", effect=effects.delete()),
        effect_update=deno.func(req2, res2, code="(x) => x", effect=effects.update()),
        effect_upsert=deno.func(req2, res2, code="(x) => x", effect=effects.update()),
        user=gql.query(
            t.struct({"id": t.integer()}),
            user.extend(
                {
                    "from_parent": deno.identity(t.struct({"email": t.email()})).reduce(
                        {"email": g.inherit().from_parent("email")}
                    ),
                    "messagesSent": find_messages.reduce(
                        {
                            "where": {
                                "senderId": g.inherit().from_parent("id"),
                            }
                        }
                    ),
                }
            ),
            path=("user",),
        ),
    )
