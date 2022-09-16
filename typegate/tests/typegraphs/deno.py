from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import DenoRuntime
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import ModuleMat
from typegraph.types import typedefs as t

with TypeGraph("test-vars") as g:
    allow_all = policies.allow_all()
    mod = ModuleMat("ts/deno.ts", runtime=DenoRuntime(worker="worker 1"))

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
    )
