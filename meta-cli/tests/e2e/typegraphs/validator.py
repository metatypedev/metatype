from typegraph import TypeGraph, t
from typegraph.runtimes import deno

with TypeGraph("invalid_injections") as g:
    record = t.struct(
        {
            "a": t.integer().set("1"),
            "b": t.string().set(["h", "e", "l", "l", "o"]),
            "c": t.integer().min(2).set(0),
            "d": t.string().max(4).set("hello"),
            "e": t.struct({"a": t.integer()}).set({}),
            "f": t.struct({"a": t.integer()}).set({"b": 1}),
            "g": t.struct({"a": t.integer()}).set({"a": 2, "b": 1}),
        }
    )

    g.expose(test=t.func(record, record, deno.PredefinedFunMat("identity")))
