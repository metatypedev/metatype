from typegraph import typegraph, t, Graph, Policy
from typegraph.providers import PrismaRuntime


@typegraph()
def migration_failure_test(g: Graph):
    db = PrismaRuntime("main", "POSTGRES")

    record = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "age": t.string(),  # option:1
            # "age": t.integer(),  # option:2
        }
    )

    g.expose(Policy.public(), createRecord=db.create(record))
