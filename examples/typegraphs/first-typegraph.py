from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import RandomRuntime


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def first_typegraph(g: Graph):
    # declare runtimes and policies
    random = RandomRuntime(reset=None)
    public = Policy.public()

    # declare types
    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
        }
    )

    # expose them with policies
    g.expose(
        public,
        # input → output via materializer
        get_message=random.gen(message),
    )
