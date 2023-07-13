from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python import Python, PyModuleMat


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
        testMod=t.func(
            t.struct({"name": t.string()}),
            t.string(),
            PyModuleMat("py/hello.py").imp("sayHello"),
        ),
        default_policy=[public],
    )
