from pathlib import Path

from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.worker import WorkerRuntime
from typegraph.types import typedefs as t

with TypeGraph(name="math") as g:
    worker = WorkerRuntime("worker 1")

    allow_all = policies.allow_all()
    g.fun(
        '(context) => context["referer"] && new URL(context["referer"]).pathname === "/math"',
        name="restrictReferer",
    )
    restrict_referer = t.func(
        t.struct(), t.boolean(), FunMat("restrictReferer", runtime=worker)
    ).named("restrict_referer_policy")

    fib = g.module(load=Path(__file__).absolute().parent / "includes/fib.ts")
    random_item = g.fun(
        "({ items }) => items[Math.floor(Math.random() * items.length)]"
    )

    g.expose(
        fib=t.func(
            t.struct({"size": t.integer()}),
            t.list(t.float()),
            FunMat("default", import_from=fib, runtime=worker),
        ).add_policy(restrict_referer),
        random=t.func(
            t.struct(),
            t.float(),
            FunMat(g.fun("() => Math.random()")),
        ).add_policy(allow_all),
        randomItem=t.func(
            t.struct({"items": t.list(t.string())}),
            t.string(),
            FunMat(random_item, runtime=worker),
        ).add_policy(allow_all),
        randomIntInRange=t.func(
            t.struct({"from": t.integer(), "to": t.integer()}),
            t.integer(),
            FunMat(
                "default",
                import_from=g.module(
                    """
                    export default function(
                        { from, to }: { from: number, to: number },
                        context: Record<string, string>,
                    ) {
                        const extent = to - from;
                        if (extent <= 0) throw new Error("invalid range");
                        return from + Math.floor(Math.random() * extent);
                    }
                    """
                ),
            ),
        ).add_policy(allow_all),
    )
