from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def testing(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    rec = deno.func(
        t.struct({"nested": t.struct({"arg": t.integer()}, name="Nested")}),
        t.integer(),
        code="(args) => args.nested && args.nested.arg",
    )

    g.expose(
        rec=rec.with_policy(public),
        test=deno.identity(
            t.struct({"a": t.integer(name="arg1")}, name="inp"),
        )
        .with_policy(public)
        .rename("f"),
    )
