from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.python import PythonRuntime, PythonModule


@typegraph()
def python(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        public,
        add=python.from_lambda(
            t.struct({"a": t.integer(), "b": t.integer()}),
            t.integer(),
            # we can provide the code inline using lambdas
            function=lambda x: x["a"] + x["b"],
        ),
        sayHello=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            # point to a local python file
            module="./scripts/hello.py",
            name="say_hello",  # name of the function to use
            # deps=["deps.py"], path to dependencies
        ),
    )

    # We can also use the following method for reusability
    module = PythonModule(path="./scripts/hello.py", deps=["./scripts/deps.py"])

    g.expose(
        public,
        sayHelloAlt=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module=module.import_("say_hello"),  # name of the function to use
        ),
    )
