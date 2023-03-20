from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python_wasi import PythonWasiRuntime

with TypeGraph("python_wasi") as g:
    public = policies.public()
    python = PythonWasiRuntime()

    g.expose(
        test=t.func(
            t.struct({"a": t.string()}),
            t.string(),
            python.from_lambda(lambda x: x["a"]),
        ),
        default_policy=[public],
    )
