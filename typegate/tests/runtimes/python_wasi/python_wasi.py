from typegraph import TypeGraph, policies, t
from typegraph.runtimes.python import PyModuleMat, Python


def test(x):
    return x["a"]


def identity(x):
    return x["input"]


def stackoverflow(x):
    def fn():
        return fn()

    if x["enable"]:
        fn()
    return x["enable"]


def infinite_loop(x):
    import time

    # while x["enable"]:
    #     print("tic tac")
    # blocking
    time.sleep(20000)  # still blocking main thread
    return x["enable"]


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
        stackOverflow=t.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            python.from_def(stackoverflow),
        ),
        infiniteLoop=t.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            python.from_def(infinite_loop),
        ),
        default_policy=[public],
    )
