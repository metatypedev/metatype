from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.types import typedefs as t


with TypeGraph("injection") as g:

    req = t.struct(
        {
            "a": t.integer().named("A"),
            "b": t.integer().s_raw(1),
            "c": t.string().s_raw("2"),
            "d": t.integer().s_secret("TEST_VAR"),
            "f": t.struct({"in": t.integer()}).s_raw({"in": -1}),
        }
    )

    copy = t.struct({"a2": t.integer().s_parent(g("A"))})

    res = t.struct(
        {**req.of, "e": t.func(copy, copy, deno.PredefinedFunMat("identity"))}
    )

    g.expose(
        test=t.func(
            req,
            res,
            deno.PredefinedFunMat("identity"),
        ).add_policy(policies.allow_all()),
    )
