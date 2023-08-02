from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python import PyModuleMat, Python


def test(x):
    return x["a"]


def identity(x):
    return x["input"]


with TypeGraph("python_wasi") as g:
    public = policies.public()
    python = Python()

    tpe = t.struct({"a": t.integer(), "b": t.struct({"c": t.array(t.string())})})

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
        identity=t.func(
            t.struct({"input": tpe}),
            tpe,
            python.from_def(identity),
        ),
        hello=t.func(
            t.struct({"world": t.string()}),
            t.struct({"test": t.string()}),
            python.from_lambda(lambda x: {"test": x["world"]}),
        ),
        default_policy=[public],
    )
