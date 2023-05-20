from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python import Python

with TypeGraph(name="example") as g:
    public = policies.public()
    python = Python()

    hello = t.func(
        t.struct({"world": t.string()}),
        t.string(),
        python.from_lambda(lambda x: f"Hello {x['world']}!"),
    )

    g.expose(hello=hello, default_policy=public)
