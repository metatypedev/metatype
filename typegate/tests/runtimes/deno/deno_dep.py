from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("deno_dep") as g:
    public = policies.public()

    g.expose(
        doAddition=t.func(
            t.struct({"a": t.number(), "b": t.number()}),
            t.number(),
            ModuleMat("ts/dep/main.ts").imp("doAddition"),
        ),
        default_policy=[public],
    )
