from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def math(g: Graph):
    deno = DenoRuntime()

    public = Policy.public()

    restrict_referer = deno.policy(
        "restrict_referer_policy",
        '(_, context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
    )

    random_item_fn = "({ items }) => items[Math.floor(Math.random() * items.length)]"

    g.expose(
        fib=deno.import_(
            t.struct({"size": t.integer()}),
            t.list(t.float()),
            module="fib.ts",
            name="default",
        ).with_policy(restrict_referer),
        random=deno.func(
            t.struct(),
            t.float(),
            code="() => Math.random()",
        ).with_policy(public),
        randomItem=deno.func(
            t.struct({"items": t.list(t.string())}),
            t.string(),
            code=random_item_fn,
        ).with_policy(public),
    )
