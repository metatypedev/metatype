# skip:start
from typegraph import typegraph, t, Graph
from typegraph.graph.params import Cors


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def typecheck(g: Graph):
    # skip:end
    t.struct(
        {
            "name": t.string(max=200),
            "age": t.optional(t.integer()),  # or t.integer().optional()
            "messages": t.list(t.struct({"text": t.string(), "sentAt": t.datetime()})),
        }
    )

    # the typegate will accept data as follow
    {
        "name": "Alan",
        "age": 28,
        "messages": [{"text": "Hello!", "sentAt": "2022-12-28T01:11:10Z"}],
    }

    # and reject invalid data
    {"name": "Turing", "messages": [{"sentAt": 1}]}
