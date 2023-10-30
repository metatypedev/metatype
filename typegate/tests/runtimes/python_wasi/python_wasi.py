from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.python import PythonRuntime


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


tpe = t.struct({"a": t.integer(), "b": t.struct({"c": t.list(t.string())})})


@typegraph()
def python_wasi(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test=python.from_lambda(
            t.struct({"a": t.string()}),
            t.string(),
            lambda x: x["a"],
        ).with_policy(public),
        testDef=python.from_def(
            t.struct({"a": t.string()}),
            t.string(),
            test,
        ).with_policy(public),
        testMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            name="sayHello",
        ).with_policy(public),
        identity=python.from_def(
            t.struct({"input": tpe}),
            tpe,
            identity,
        ).with_policy(public),
        stackOverflow=python.from_def(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            stackoverflow,
        ).with_policy(public),
        infiniteLoop=python.from_def(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            infinite_loop,
        ).with_policy(public),
    )
