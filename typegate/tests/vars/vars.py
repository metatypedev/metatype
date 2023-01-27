from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PureFunMat

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
            PureFunMat("({ first, second }) => first + second"),
        ).add_policy(policies.public()),
        sum=t.func(
            t.struct({"numbers": t.array(t.integer())}),
            t.integer(),
            PureFunMat("({ numbers }) => numbers.reduce((a, b) => a + b, 0)"),
        ).add_policy(policies.public()),
        level2=t.func(
            t.struct(
                {"level1": t.struct({"level2": t.array(t.string())}).named("Level1")}
            ),
            t.string(),
            PureFunMat("(arg) => arg.level1.level2[0]"),
        ).add_policy(policies.public()),
    )
