from typegraph import TypeGraph, policies, t
from typegraph.policies import Policy
from typegraph.runtimes.deno import DenoRuntime, ModuleMat, PureFunMat

with TypeGraph(name="math") as g:
    worker = DenoRuntime(worker="worker 1")

    public = policies.public()

    restrict_referer = Policy(
        PureFunMat(
            '(_, context) => context["headers"]["referer"] && new URL(context["headers"]["referer"]).pathname === "/math"',
            runtime=worker,
        ),
    ).named("restrict_referer_policy")

    fib = ModuleMat("fib.ts", runtime=worker)

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
            PureFunMat("() => Math.random()"),
        ).add_policy(public),
        randomItem=t.func(
            t.struct({"items": t.array(t.string())}),
            t.string(),
            PureFunMat(random_item_fn, runtime=worker),
        ).add_policy(public),
    )
