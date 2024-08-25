from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime

from typegraph import t, typegraph


@typegraph()
def python_duplicate_artifact(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        testMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            deps=["py/nested/dep.py"],
            name="sayHello",
        ).with_policy(public),
        testModDuplicate=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            deps=["py/nested/dep.py"],
            name="sayHello",
        ).with_policy(public),
    )
