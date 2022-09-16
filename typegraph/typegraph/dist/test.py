from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoRuntime
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import PredefinedFunMat
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.materializers.http import HTTPRuntime
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

with TypeGraph("test") as g:

    remote = GraphQLRuntime("http://localhost:5000/graphql")
    db = PrismaRuntime("postgresql://postgres:password@localhost:5432/db")
    ipApi = HTTPRuntime("http://ip-api.com/json")
    js = DenoRuntime(worker="js")

    messages = t.struct(
        {
            "id": t.integer(),
            "user_id": t.integer(),
            "message": t.string(),
            "users": g("users"),
        }
    ).named("messages")

    users = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
            "messages": t.list(messages),
        }
    ).named("users")

    allow_all_policy = t.policy(
        t.struct(),  # t.struct({"claim", g.claim.inject}),
        FunMat.from_lambda(lambda args: True),
    ).named("allow_all_policy")

    arg = t.struct({"value": t.integer(), "nested": t.struct({"value": t.integer()})})

    out = t.integer().named("out")
    getter = (
        t.func(
            t.struct({"a": t.integer().named("arg1")}).named("inp"),
            t.struct(
                {
                    "a": t.integer().named("deps"),
                    "b": t.integer().s_optional().named("deps_opt"),
                    "c": t.func(
                        t.struct(
                            {
                                "injection": t.integer().s_parent(g("deps")),
                                "nested_injection": t.struct(
                                    {"value": t.integer().s_parent(g("deps"))}
                                ),
                                "default": t.string().s_optional("ddds"),
                                "forced": t.string().s_raw("dddsaaa"),
                                "nested_default": t.struct(
                                    {"value": t.string()}
                                ).s_optional({"value": "a"}),
                                "nested_inner_default": t.struct(
                                    {"value": t.string().s_optional("b")}
                                ),
                                "nested_apply": t.struct({"value": t.string()}).s_raw(
                                    {"value": "c"}
                                ),
                                "nested_inner_apply": t.struct(
                                    {"value": t.string().s_raw("d")}
                                ),
                            }
                        ),
                        t.integer(),
                        PredefinedFunMat("identity"),
                    ),
                    "ip": ipApi.get(
                        "24.48.0.1",
                        t.struct({}),
                        t.struct(
                            {
                                "status": t.string(),
                                "country": t.string(),
                                "countryCode": t.string(),
                                "region": t.string(),
                                "regionName": t.string(),
                                "city": t.string(),
                                "zip": t.string(),
                                "lat": t.float(),
                                "lon": t.float(),
                                "timezone": t.string(),
                                "isp": t.string(),
                                "org": t.string(),
                                "as": t.string(),
                                "query": t.string(),
                            }
                        ),
                    ),
                    "out": out,
                    # "findManymessages": db.generate_read(t.list(messages)),
                    "ql": remote.query(
                        t.struct({"identifier": t.string()}),
                        t.string().s_optional(),
                    ),
                    "remote": remote.query(
                        t.struct(),
                        t.struct(
                            {
                                "integer": t.integer().named("res_int"),
                                "nested": g("remote"),
                                "duration": t.func(
                                    t.struct({"integer": g("res_int")}),
                                    t.integer().named("duration_remote"),
                                    FunMat.from_lambda(
                                        lambda args: args.parent.integer * 3
                                    ),
                                ).named("compute_duration_remote"),
                            }
                        ).named("remote"),
                    ),
                    "duration": t.gen(
                        t.integer().named("duration"),
                        FunMat.from_lambda(lambda args: args.parent.out * 2),
                    ).named("compute_duration"),
                    "self": g("f"),
                    "nested": t.struct({"ok": out, "self": g("f")}).named("nested"),
                }
            ).named("res"),
            FunMat(
                """
                ({ a }: { a: number; }) => {
                    return {
                        out: a * 2,
                        a: 2,
                        b: null,
                    };
                }
                """
            ),
            # FunMat(
            #     """
            #     ({ a }: { a: number; }) => {
            #         return {
            #             out: a * 2,
            #             a: 2,
            #             b: null,
            #             nested: () => ({
            #                 ok: 0,
            #             }),
            #         };
            #     }
            #     """
            # ),
        )
        .named("f")
        .add_policy(allow_all_policy)
    )

    g.expose(test=getter)
