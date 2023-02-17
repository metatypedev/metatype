from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime, ModuleMat

with TypeGraph("test-internal") as g:
    public = policies.public()

    worker1 = DenoRuntime(
        worker="worker 1", allow_net=("deno.land", "cdn.pika.dev", "cdn.skypack.dev")
    )

    math_npm = ModuleMat("ts/logic.ts", runtime=worker1)

    g.expose(
        add=t.func(
            t.struct({"first": t.number(), "second": t.number()}),
            t.number(),
            math_npm.imp("sum"),
        ).add_policy(public),
    )
