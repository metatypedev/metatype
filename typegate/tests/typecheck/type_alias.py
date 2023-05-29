from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomMat, RandomRuntime

with TypeGraph(
    "type_alias",
) as g:
    random = RandomRuntime(seed=1)
    public = policies.public()

    infos = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
        }
    )

    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
            "info": t.array(infos),
        }
    )

    g.expose(
        get_message=t.func(t.struct(), message, RandomMat(random)),
        default_policy=[public],
    )
