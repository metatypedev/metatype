from typegraph import TypeGraph, effects, injection, policies, t
from typegraph.runtimes import deno
from typegraph.runtimes.graphql import GraphQLRuntime

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
            "alt_raw": t.string().inject(injection.static("2")),
            "alt_secret": t.string().inject(injection.secret("TEST_VAR")),
            "alt_context": t.string().inject(injection.context("userId")),
            # "alt_context_missing": t.string().inject(injection.context("inexistent")), # fail
            "alt_context_opt": t.string()
            .optional()
            .inject(injection.context("userId")),
            "alt_context_opt_missing": t.string()
            .optional()
            .inject(injection.context("userId")),
        }
    )

    req2 = t.struct(
        {
            "operation": t.enum(["insert", "modify", "remove", "read"]).inject(
                {
                    "create": injection.static("insert"),
                    "update": injection.static("modify"),
                    "delete": injection.static("remove"),
                    None: injection.static("read"),
                }
            )
        }
    )

    copy = t.struct({"a2": t.integer().from_parent(g("A"))})

    gql = GraphQLRuntime("https://example.com/api/graphql")
    res = t.struct(
        {
            **req.props,
            "parent": t.func(copy, copy, deno.PredefinedFunMat("identity")),
            "graphql": gql.query(
                t.struct({"id": t.integer().from_parent(g("A"))}),
                t.struct(
                    {
                        "id": t.integer(),
                        "name": t.string(),
                        "email": t.email(),
                    }
                ),
                path=("user",),
            ),
        }
    )

    g.expose(
        test=t.func(
            req,
            res,
            deno.PredefinedFunMat("identity"),
        ).add_policy(policies.public()),
        effect_none=t.func(req2, req2, deno.PredefinedFunMat("identity")).add_policy(
            policies.public()
        ),
        effect_create=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.create())
        ).add_policy(policies.public()),
        effect_delete=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.delete())
        ).add_policy(policies.public()),
        effect_update=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.update())
        ).add_policy(policies.public()),
        effect_upsert=t.func(
            req2, req2, deno.PredefinedFunMat("identity", effect=effects.upsert())
        ).add_policy(policies.public()),
    )
