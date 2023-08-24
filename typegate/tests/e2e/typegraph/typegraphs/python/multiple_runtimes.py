from typegraph_next import t, typegraph, Graph
from typegraph_next.policy import Policy
from typegraph_next.runtimes.python import PythonRuntime
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph()
def test_multiple_runtimes(g: Graph):
    public = Policy.public()
    deno = DenoRuntime()
    python = PythonRuntime()

    g.expose(
        add=t.func(
            t.struct(
                {
                    "first": t.float(),
                    "second": t.float(),
                }
            ),
            t.float(),
            python.from_lambda(lambda x: x["first"] + x["second"]),
        ).with_policy(public),
        multiply=deno.func(
            t.struct({"first": t.float(), "second": t.float()}),
            t.float(),
            code="({ first, second }) => first * second",
        ).with_policy(public),
    )
