from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.python import PythonRuntime


@typegraph()
def example(g: Graph):
    references = t.struct(
        {"string": t.string(), "example": g.ref("Example").optional()},
        name="References",
    )
    example = t.struct(
        {
            "string": t.string(),
            "integer": t.integer(),
            "email": t.email().optional(),
            "list_integer": t.list(t.integer()),
            "opt_union_flat": t.union([t.integer(), t.integer(), t.float()]).optional(),
            "reference": t.list(g.ref("Example")).optional(),
            "nested_ref": t.struct(
                {"either": t.either([g.ref("Example"), references])}
            ),
        },
        name="Example",
    )
    python = PythonRuntime()
    pub = Policy.public()
    g.expose(
        pub,
        duplicate=python.import_(
            example,
            t.list(example).rename("Duplicates"),
            name="identity",
            module="scripts/example.py",
        ),
    )
