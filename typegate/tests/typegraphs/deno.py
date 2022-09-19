from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoRuntime
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import ModuleMat
from typegraph.types import typedefs as t

with TypeGraph("test-vars") as g:
    allow_all = policies.allow_all()
    mod = ModuleMat("ts/deno.ts")
    math0 = ModuleMat("ts/math.ts")

    worker1 = DenoRuntime(
        worker="worker 1", net=("deno.land", "cdn.pika.dev", "cdn.skypack.dev")
    )
    math1 = ModuleMat("ts/math.ts", runtime=worker1)

    min_input = t.struct({"numbers": t.list(t.float())})

    math_npm = ModuleMat("ts/math-npm.ts", runtime=worker1)

    g.expose(
        add=t.func(
            t.struct({"first": t.float(), "second": t.float()}),
            t.float(),
            FunMat("({ first, second }) => first + second"),
        ).add_policy(allow_all),
        sum=t.func(
            t.struct({"numbers": t.list(t.integer())}), t.integer(), mod.imp("sum")
        ).add_policy(allow_all),
        count=t.func(t.struct(), t.unsigned_integer(), mod.imp("counter")).add_policy(
            allow_all
        ),
        min0=t.func(min_input, t.float(), math0.imp("min")).add_policy(allow_all),
        min1=t.func(min_input, t.float(), math1.imp("min")).add_policy(allow_all),
        log=t.func(
            t.struct({"number": t.float(), "base": t.float().s_optional()}),
            t.float(),
            math_npm.imp("log"),
        ).add_policy(allow_all),
    )
