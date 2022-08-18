from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import typedefs as t

with TypeGraph("test-vars") as g:
    add = g.fun("({ first, second }) => first + second")
    sum = g.fun("({ numbers }) => numbers.reduce((a, b) => a+ b, 0)")
    g.expose(
        add=t.func(
            t.struct(
                {
                    "first": t.integer(),
                    "second": t.integer(),
                }
            ),
            t.integer(),
            FunMat(add),
        ).add_policy(policies.allow_all()),
        sum=t.func(
            t.struct({"numbers": t.list(t.integer())}),
            t.integer(),
            FunMat(sum),
        ).add_policy(policies.allow_all()),
    )
