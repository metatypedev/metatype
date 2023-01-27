from typegraph import Effect
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.policies import Policy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.deno import ModuleMat
from typegraph.runtimes.deno import PureFunMat

with TypeGraph(name="math") as g:
    worker = DenoRuntime(worker="worker 1")

    public = policies.public()

    restrict_referer = Policy(
        PureFunMat(
            '(context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
            runtime=worker,
        ),
    ).named("restrict_referer_policy")

    fib = ModuleMat("fib.ts", runtime=worker)

    random_item_fn = "({ items }) => items[Math.floor(Math.random() * items.length)]"

    g.expose(
        fib=t.func(
            t.struct({"size": t.integer()}),
            t.array(t.float()),
            fib.imp("default", effect=Effect.none()),
        ).add_policy(restrict_referer),
        random=t.func(
            t.struct(),
            t.float(),
            PureFunMat("() => Math.random()"),
        ).add_policy(public),
        randomItem=t.func(
            t.struct({"items": t.array(t.string())}),
            t.string(),
            PureFunMat(random_item_fn, runtime=worker),
        ).add_policy(public),
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
            ).imp("default", effect=Effect.none()),
        ).add_policy(public),
    )
