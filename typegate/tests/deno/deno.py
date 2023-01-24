from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.deno import ModuleMat


with TypeGraph("test-vars") as g:
    public = policies.public()
    mod = ModuleMat("ts/deno.ts")
    math0 = ModuleMat("ts/math.ts")

    worker1 = DenoRuntime(
        worker="worker 1", allow_net=("deno.land", "cdn.pika.dev", "cdn.skypack.dev")
    )
    math1 = ModuleMat("ts/math.ts", runtime=worker1)

    min_input = t.struct({"numbers": t.array(t.number())})

    math_npm = ModuleMat("ts/math-npm.ts", runtime=worker1)

    g.expose(
        add=t.func(
            t.struct({"first": t.number(), "second": t.number()}),
            t.number(),
            FunMat("({ first, second }) => first + second"),
        ).add_policy(public),
        sum=t.func(
            t.struct({"numbers": t.array(t.integer())}), t.integer(), mod.imp("sum")
        ).add_policy(public),
        count=t.func(t.struct(), t.integer().min(0), mod.imp("counter")).add_policy(
            public
        ),
        min0=t.func(min_input, t.number(), math0.imp("min")).add_policy(public),
        min1=t.func(min_input, t.number(), math1.imp("min")).add_policy(public),
        log=t.func(
            t.struct({"number": t.number(), "base": t.number().optional()}),
            t.number(),
            math_npm.imp("log"),
        ).add_policy(public),
    )
