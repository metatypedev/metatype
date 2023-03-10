from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime, ModuleMat

with TypeGraph("test-internal") as g:
    public = policies.public()
    internal = policies.internal()

    worker1 = DenoRuntime(worker="worker 1")
    math_npm = ModuleMat("ts/logic.ts", runtime=worker1)

    inp = t.struct({"first": t.number(), "second": t.number()})
    out = t.number()

    g.expose(
        sum=t.func(
            inp,
            out,
            math_npm.imp("sum"),
        ).add_policy(internal),
        remoteSum=t.func(
            inp,
            out,
            math_npm.imp("remoteSum"),
        ).add_policy(public),
    )
