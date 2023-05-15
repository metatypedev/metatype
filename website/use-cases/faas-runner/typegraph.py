# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime, PureFunMat
from typegraph.runtimes.python import Python

# skip:end
with TypeGraph(
    "faas-runner",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()

    deno = DenoRuntime()
    python = Python()

    def cumsum(mat):
        inp = t.struct({"n": t.integer().min(0).max(100)})
        out = t.integer()
        return t.func(inp, out, mat)

    g.expose(
        pycumsum=cumsum(python.from_lambda(lambda inp: sum(range(inp["n"])))),
        tscumsum=cumsum(
            PureFunMat(
                "({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)"
            )
        ),
        default_policy=[public],
    )
