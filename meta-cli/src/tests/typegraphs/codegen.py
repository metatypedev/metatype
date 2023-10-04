from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes import DenoRuntime


@typegraph()
def math(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    g.expose(
        div=deno.import_(
            t.struct(
                {
                    "dividend": t.integer(),
                    "divisor": t.integer(),
                },
                name="Input",
            ),
            t.struct(
                {
                    "quotient": t.integer(),
                    "remainder": t.integer(),
                },
                name="Output",
            ),
            module="/inexisting/path/to/ts/module.ts",
            name="div",
        ).with_policy(public)
    )
