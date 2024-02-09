from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def renamed_params(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        renamed=deno.identity(t.struct({"a": t.integer(), "b": t.integer()})).apply(
            {
                "a": g.as_arg("first"),
                "b": g.as_arg("second"),
            }
        ),
    )
