from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph(name="math") as g:
    public = policies.public()
    mod = ModuleMat("/inexisting/path/to/ts/module.ts")
    g.expose(
        div=t.func(
            t.struct(
                {
                    "dividend": t.integer(),
                    "divisor": t.integer(),
                }
            ).named("Input"),
            t.struct(
                {
                    "quotient": t.integer(),
                    "remainder": t.integer(),
                }
            ).named("Output"),
            mod.imp("div"),
        ).add_policy(public)
    )
