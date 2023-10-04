from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import PythonRuntime


@typegraph()
def example(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    hello = python.from_lambda(
        t.struct({"world": t.string()}),
        t.string(),
        lambda x: f"Hello {x['world']}!",
    )

    g.expose(public, hello=hello)
