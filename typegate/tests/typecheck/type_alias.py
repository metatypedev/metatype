from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomMat, RandomRuntime

with TypeGraph(
    "type-alias",
) as g:
    random = RandomRuntime()
    public = policies.public()

    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
        }
    )

    g.expose(
        get_message=t.func(t.struct(), message, RandomMat(random)),
        default_policy=[public],
    )
