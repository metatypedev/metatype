# Copyright Metatype under the Elastic License 2.0.

from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.deno import PredefinedFunMat
from typegraph.runtimes.graphql import GraphQLRuntime
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("test") as g:

    remote = GraphQLRuntime("http://localhost:5000/graphql")
    db = PrismaRuntime("test", "POSTGRES")
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
            "messages": t.array(messages),
        }
    ).named("users")

    allow_all_policy = policies.allow_all()

    arg = t.struct({"value": t.integer(), "nested": t.struct({"value": t.integer()})})

    out = t.integer().named("out")
    getter = (
        t.func(
            t.struct({"a": t.integer().named("arg1")}).named("inp"),
            t.struct(
                {
                    "a": t.integer().named("deps"),
                    "b": t.integer().optional().named("depopt"),
                    "c": t.func(
                        t.struct(
                            {
                                "injection": t.integer().from_parent(g("deps")),
                                "nested_injection": t.struct(
                                    {"value": t.integer().from_parent(g("deps"))}
                                ),
                                "default": t.string().optional("ddds"),
                                "forced": t.string().set("dddsaaa"),
                                "nested_default": t.struct(
                                    {"value": t.string()}
                                ).optional({"value": "a"}),
                                "nested_inner_default": t.struct(
                                    {"value": t.string().optional("b")}
                                ),
                                "nested_apply": t.struct({"value": t.string()}).set(
                                    {"value": "c"}
                                ),
                                "nested_inner_apply": t.struct(
                                    {"value": t.string().set("d")}
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
                    # "findManymessages": db.generate_read(t.array(messages)),
                    "ql": remote.query(
                        t.struct({"identifier": t.string()}),
                        t.string().optional(),
                    ),
                    "remote": remote.query(
                        t.struct(),
                        t.struct(
                            {
                                "integer": t.integer().named("reint"),
                                "nested": g("remote"),
                                "duration": t.func(
                                    t.struct({"integer": g("reint")}),
                                    t.integer().named("duration_remote"),
                                    FunMat("(args) => args.parent.integer * 3", effect=None, idempotent=True),
                                ).named("compute_duration_remote"),
                            }
                        ).named("remote"),
                    ),
                    "duration": t.gen(
                        t.integer().named("duration"),
                        FunMat("(args) => args.parent.out * 2", effect=None, idempotent=True),
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
                """,
                effect=None, idempotent=True
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
