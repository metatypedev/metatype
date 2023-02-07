from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.random import RandomRuntime

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
            "body": t.string(),
        }
    )

    # expore them with materializers
    g.expose(
        get_message=t.func(t.struct(), message, random.generate()),
        default_policy=[public],
    )
