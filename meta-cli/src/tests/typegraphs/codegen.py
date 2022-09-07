from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import ModuleMat
from typegraph.types import typedefs as t

with TypeGraph(name="math") as g:
    allow_all = policies.allow_all()
    mod = ModuleMat(file="/inexisting/path/to/ts/module.ts")
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
        ).add_policy(allow_all)
    )
