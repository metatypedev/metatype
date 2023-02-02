from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.random import RandomMat
from typegraph.runtimes.random import RandomRuntime

with TypeGraph(name="random") as g:
    runtime_1 = RandomRuntime(seed=1)
    runtime_2 = RandomRuntime(seed=1)

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

    list = t.struct(
        {
            "array_of_array_of_names": t.array(t.array(t.string().config(gen="name"))),
        }
    ).named("RandomList")

    public = policies.public()

    g.expose(
        randomRec=t.gen(rec, RandomMat(runtime=runtime_1)).add_policy(public),
        randomUser=t.gen(g("User"), RandomMat(runtime=runtime_1)).add_policy(public),
        randomList=t.gen(g("RandomList"), RandomMat(runtime=runtime_2)).add_policy(
            public
        ),
    )
