from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.random import RandomMat
from typegraph.materializers.random import RandomRuntime
from typegraph.types import typedefs as t

with TypeGraph(name="random") as g:
    runtime = RandomRuntime(seed=1)

    rec = t.struct(
        {
            "uuid": t.uuid(),
            "int": t.integer(),
            "str": t.string(),
            "email": t.email(),
        }
    )

    users = t.struct(
        {
            "id": t.integer(),
            "name": t.string(),
            "age": t.integer(),
        }
    ).named("User")

    allow_all = policies.allow_all()

    g.expose(
        randomRec=t.gen(rec, RandomMat(runtime=runtime)).add_policy(allow_all),
        randomUser=t.gen(g("User"), RandomMat(runtime=runtime)).add_policy(allow_all),
    )
