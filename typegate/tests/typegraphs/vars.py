from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import typedefs as t

with TypeGraph("test-vars") as g:
    g.expose(
        add=t.func(
            t.struct(
                {
                    "first": t.integer(),
                    "second": t.integer(),
                }
            ),
            t.integer(),
            FunMat("({ first, second }) => first + second"),
        ).add_policy(policies.allow_all()),
        sum=t.func(
            t.struct({"numbers": t.list(t.integer())}),
            t.integer(),
            FunMat("({ numbers }) => numbers.reduce((a, b) => a + b, 0)"),
        ).add_policy(policies.allow_all()),
        level2=t.func(
            t.struct(
                {"level1": t.struct({"level2": t.list(t.string())}).named("Level1")}
            ),
            t.string(),
            FunMat("(arg) => arg.level1.level2[0]"),
        ).add_policy(policies.allow_all()),
    )
