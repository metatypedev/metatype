from typegraph_next import t, typegraph, Policy, Graph
from typegraph_next.runtimes.python import PythonRuntime


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


tpe = t.struct({"a": t.integer(), "b": t.struct({"c": t.array(t.string())})})


@typegraph()
def python_wasi(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test=t.func(
            t.struct({"a": t.string()}),
            t.string(),
            python.from_lambda(lambda x: x["a"]),
        ).with_policy(public),
        testDef=t.func(
            t.struct({"a": t.string()}),
            t.string(),
            python.from_def(test),
        ).with_policy(public),
        testMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            name="sayHello",
        ).with_policy(public),
        identity=t.func(
            t.struct({"input": tpe}),
            tpe,
            python.from_def(identity),
        ).with_policy(public),
        stackOverflow=t.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            python.from_def(stackoverflow),
        ).with_policy(public),
        infiniteLoop=t.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            python.from_def(infinite_loop),
        ).with_policy(public),
    )
