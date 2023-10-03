from typegraph_next import Graph, t, typegraph
from typegraph_next.policy import Policy
from typegraph_next.runtimes.deno import DenoRuntime
from typegraph_next.runtimes.python import PythonRuntime


@typegraph()
def test_multiple_runtimes(g: Graph):
    public = Policy.public()
    deno = DenoRuntime()
    python = PythonRuntime()

    g.expose(
        add=python.from_lambda(
            t.struct(
                {
                    "first": t.float(),
                    "second": t.float(),
                }
            ),
            t.float(),
            lambda x: x["first"] + x["second"],
        ).with_policy(public),
        multiply=deno.func(
            t.struct({"first": t.float(), "second": t.float()}),
            t.float(),
            code="({ first, second }) => first * second",
        ).with_policy(public),
    )
