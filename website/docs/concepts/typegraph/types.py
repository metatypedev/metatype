# skip:start
from typegraph import typegraph, t, Graph


@typegraph()
def types(g: Graph):
    # skip:end
    t.struct(
        {
            "id": t.uuid(),
            "age": t.integer(),
            "cars": t.list(
                t.struct(
                    {
                        "model": t.string(),
                        "name": t.string().optional(),
                    }
                )
            ),
        }
    )
