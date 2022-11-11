from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoRuntime
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import ModuleMat
from typegraph.types import types as t

with TypeGraph(name="math") as g:
    worker = DenoRuntime(worker="worker 1")

    allow_all = policies.allow_all()

    restrict_referer = t.func(
        t.struct(),
        t.boolean(),
        FunMat(
            '(context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
            runtime=worker,
        ),
    ).named("restrict_referer_policy")

    fib = ModuleMat("includes/fib.ts", runtime=worker)

    random_item_fn = "({ items }) => items[Math.floor(Math.random() * items.length)]"

    g.expose(
        fib=t.func(
            t.struct({"size": t.integer()}),
            t.array(t.float()),
            fib.imp("default"),
        ).add_policy(restrict_referer),
        random=t.func(
            t.struct(),
            t.float(),
            FunMat("() => Math.random()"),
        ).add_policy(allow_all),
        randomItem=t.func(
            t.struct({"items": t.array(t.string())}),
            t.string(),
            FunMat(random_item_fn, runtime=worker),
        ).add_policy(allow_all),
        randomIntInRange=t.func(
            t.struct({"from": t.integer(), "to": t.integer()}),
            t.integer(),
            ModuleMat(
                code="""
                    export default function(
                        { from, to }: { from: number, to: number },
                        context: Record<string, string>,
                    ) {
                        const extent = to - from;
                        if (extent <= 0) throw new Error("invalid range");
                        return from + Math.floor(Math.random() * extent);
                    }
                    """,
                runtime=worker,
            ).imp("default"),
        ).add_policy(allow_all),
    )
