from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomMat, RandomRuntime

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
            "id": t.uuid(),
            "name": t.string().config(gen="name"),
            "age": t.integer().config(gen="age", type="adult"),
            "address": t.struct(
                {
                    "street": t.string().config(gen="address"),
                    "city": t.string().config(gen="city"),
                    "postcode": t.string().config(gen="postcode"),
                    "country": t.string().config(gen="country", full=True),
                }
            ),
        }
    ).named("User")

    public = policies.public()

    g.expose(
        randomRec=t.gen(rec, RandomMat(runtime=runtime)).add_policy(public),
        randomUser=t.gen(g("User"), RandomMat(runtime=runtime)).add_policy(public),
    )
