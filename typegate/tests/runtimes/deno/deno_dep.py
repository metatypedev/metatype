from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat, PureFunMat

with TypeGraph("deno_dep") as g:
    public = policies.public()

    g.expose(
        doAddition=t.func(
            t.struct({"a": t.number(), "b": t.number()}),
            t.number(),
            ModuleMat("scripts/deno/ts/dep/main.ts").imp("doAddition"),
        ),
        simple=t.func(
            t.struct({"a": t.number(), "b": t.number()}),
            t.number(),
            PureFunMat("({ a, b }) => a + b"),
        ),
        default_policy=[public],
    )
