from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import FunMat

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
            FunMat("({ first, second }) => first + second", effect=None, idempotent=True),
        ).add_policy(policies.allow_all()),
        sum=t.func(
            t.struct({"numbers": t.array(t.integer())}),
            t.integer(),
            FunMat("({ numbers }) => numbers.reduce((a, b) => a + b, 0)", effect=None, idempotent=True),
        ).add_policy(policies.allow_all()),
        level2=t.func(
            t.struct(
                {"level1": t.struct({"level2": t.array(t.string())}).named("Level1")}
            ),
            t.string(),
            FunMat("(arg) => arg.level1.level2[0]", effect=None, idempotent=True),
        ).add_policy(policies.allow_all()),
    )
