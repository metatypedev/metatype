from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes import deno
from typegraph.runtimes.graphql import GraphQLRuntime
from typegraph.effects import CREATE, UPDATE, DELETE, NONE

with TypeGraph("injection") as g:
    req = t.struct(
        {
            "a": t.integer().named("A"),
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

    req2 = t.struct(
        {
            "operation": t.enum(["insert", "modify", "remove", "read"]).set(
                {
                    CREATE: "insert",
                    UPDATE: "modify",
                    DELETE: "remove",
                    NONE: "read",
                }
            )
        }
    )

    copy = t.struct({"a2": t.integer().from_parent(g("A"))})

    user = t.struct(
        {
            "id": t.integer().named("UserId"),
            "name": t.string(),
            "email": t.email().named("UserEmail"),
        }
    ).named("User")

    gql = GraphQLRuntime("https://example.com/api/graphql")
    res = t.struct(
        {
            **req.props,
            "parent": t.func(copy, copy, deno.PredefinedFunMat("identity")),
            "graphql": gql.query(
                t.struct({"id": t.integer().from_parent(g("A"))}),
                user,
                path=("user",),
            ),
        }
    )

    messages_db = PrismaRuntime("prisma", "POSTGRES")

    message = t.struct(
        {
            "id": t.uuid().as_id.config("auto"),
            "time": t.datetime(),
            "text": t.string(),
            "senderId": t.integer(),
            "recipientId": t.integer(),
        }
    ).named("Messages")

    find_messages = messages_db.find_many(message)

    g.expose(
        test=t.func(
            req,
            res,
            deno.PredefinedFunMat("identity"),
        ),
        effect_none=t.func(req2, req2, deno.PredefinedFunMat("identity")),
        effect_create=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.create())
        ),
        effect_delete=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.delete())
        ),
        effect_update=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.update())
        ),
        effect_upsert=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.update())
        ),
        user=gql.query(
            t.struct({"id": t.integer()}),
            t.struct(
                {
                    **user.props,
                    "from_parent": t.func(
                        t.struct({"email": t.email().from_parent("UserEmail")}),
                        t.struct({"email": t.email()}),
                        deno.PredefinedFunMat("identity"),
                    ),
                    "messagesSent": t.func(
                        find_messages.inp.compose(
                            {
                                "where": t.struct(
                                    {
                                        "senderId": t.integer().from_parent("UserId"),
                                    }
                                )
                            }
                        ),
                        find_messages.out,
                        find_messages.mat,
                    ),
                }
            ),
            path=("user",),
        ),
        default_policy=[policies.public()],
    )
