from typegraph import typegraph, t, Graph, Policy
from typegraph.providers import PrismaRuntime


@typegraph()
def migration_failure_test(g: Graph):
    db = PrismaRuntime("main", "POSTGRES")

    record = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            # "age": t.integer(),  # option:1
            # "age": t.string(),  # option:2
            # "age": t.integer(config={"default": 12}),  # option:3
            # "age": t.string(config={"default": "12"}),  # option:4
        },
        name="Record",
    )

    g.expose(Policy.public(), createRecord=db.create(record))
