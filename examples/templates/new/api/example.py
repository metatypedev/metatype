from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python_wasi import PythonWasiRuntime

with TypeGraph(name="example") as g:
    public = policies.public()
    python = PythonWasiRuntime()

    hello = t.func(
        t.struct({"world": t.string()}),
        t.string(),
        python.from_lambda(lambda x: f"Hello {x['world']}!"),
    )

    g.expose(hello=hello, default_policy=public)
