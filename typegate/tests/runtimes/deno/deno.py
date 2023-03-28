from typegraph import TypeGraph, effects, policies, t
from typegraph.runtimes.deno import DenoRuntime, ModuleMat, PureFunMat

with TypeGraph("deno") as g:
    public = policies.public()
    mod = ModuleMat("ts/deno.ts")
    math0 = ModuleMat("ts/math.ts")

    worker1 = DenoRuntime(
        worker="worker 1", allow_net=("deno.land", "cdn.pika.dev", "cdn.skypack.dev")
    )
    math1 = ModuleMat("ts/math.ts", runtime=worker1)

    number_input = t.struct({"numbers": t.array(t.number())})

    math_npm = ModuleMat("ts/math-npm.ts", runtime=worker1)

    g.expose(
        add=t.func(
            t.struct({"first": t.number(), "second": t.number()}),
            t.number(),
            PureFunMat("({ first, second }) => first + second"),
        ),
        sum=t.func(
            t.struct({"numbers": t.array(t.integer())}),
            t.integer(),
            mod.imp("sum"),
        ),
        count=t.func(
            t.struct(),
            t.integer().min(0),
            mod.imp("counter", effect=effects.update()),
        ),
        min0=t.func(number_input, t.number(), math0.imp("min")),
        min1=t.func(number_input, t.number(), math1.imp("min")),
        max=t.func(number_input, t.number(), math1.imp("maxAsync")),
        log=t.func(
            t.struct({"number": t.number(), "base": t.number().optional()}),
            t.number(),
            math_npm.imp("log"),
        ),
        default_policy=[public],
    )
