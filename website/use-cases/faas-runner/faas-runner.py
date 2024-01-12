# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import DenoRuntime, PythonRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def faas_runner(g: Graph):
    public = Policy.public()

    deno = DenoRuntime()
    python = PythonRuntime()

    inp = t.struct({"n": t.integer(min=0, max=100)})
    out = t.integer()

    g.expose(
        pycumsum=python.from_lambda(inp, out, lambda inp: sum(range(inp["n"]))),
        tscumsum=deno.func(
            inp,
            out,
            code="({n}) => Array.from(Array(5).keys()).reduce((sum, e) => sum + e, 0)",
        ),
        default_policy=[public],
    )
