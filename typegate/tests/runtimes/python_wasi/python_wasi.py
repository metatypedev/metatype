from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python import Python


def test(x):
    return x["a"]


with TypeGraph("python_wasi") as g:
    public = policies.public()
    python = Python()

    g.expose(
        test=t.func(
            t.struct({"a": t.string()}),
            t.string(),
            python.from_lambda(lambda x: x["a"]),
        ),
        testDef=t.func(
            t.struct({"a": t.string()}),
            t.string(),
            python.from_def(test),
        ),
        default_policy=[public],
    )
