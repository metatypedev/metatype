from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes import deno


with TypeGraph("injection") as g:

    req = t.struct(
        {
            "a": t.integer().named("A"),
            "b": t.integer().set(1),
            "c": t.string().set("2"),
            "d": t.integer().from_secret("TEST_VAR"),
            "f": t.struct({"in": t.integer()}).set({"in": -1}),
        }
    )

    copy = t.struct({"a2": t.integer().from_parent(g("A"))})

    res = t.struct(
        {
            **req.props,
            "e": t.func(copy, copy, deno.PredefinedFunMat("identity")),
        }
    )

    g.expose(
        test=t.func(
            req,
            res,
            deno.PredefinedFunMat("identity"),
        ).add_policy(policies.public()),
    )
