from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomMat, RandomRuntime

with TypeGraph(
    "first-typegraph",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    # declare runtimes and policies
    random = RandomRuntime()
    public = policies.public()

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
        # input → output via materializer
        get_message=t.func(t.struct({}), message, RandomMat(random)),
        default_policy=[public],
    )
