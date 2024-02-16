from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import Graph, t, typegraph


@typegraph()
def random_injection(g: Graph):
    pub = Policy.public()
    deno = DenoRuntime()

    user = t.struct(
        {
            "id": t.uuid().from_random("rand"),
            "name": t.string(config={"gen": "name"}).from_random("rand"),
            "age": t.integer(config={"gen": "age", "type": "adult"}).from_random(
                "rand"
            ),
            "married": t.boolean().from_random("rand"),
            "birthday": t.string(format="date-time").from_random("rand"),
            "friends": t.list(t.string(format="firstname")).from_random("rand"),
            "phone": t.string(format="phone").from_random("rand"),
            "gender": t.string(format="gender").from_random("rand"),
            "firstname": t.string(format="firstname").from_random("rand"),
            "lastname": t.string(format="lastname").from_random("rand"),
            "occupation": t.string(format="profession").from_random("rand"),
            "street": t.string(config={"gen": "address"}).from_random("rand"),
            "city": t.string(format="city").from_random("rand"),
            "postcode": t.string(config={"gen": "postcode"}).from_random("rand"),
            "country": t.string(format="country").from_random("rand"),
            "uri": t.string(format="uri").from_random("rand"),
            "hostname": t.string(format="hostname").from_random("rand"),
        }
    )

    random_list = t.struct(
        {
            "names": t.list(t.string(config={"gen": "name"})).from_random("rand"),
        }
    )

    g.expose(
        pub,
        randomUser=deno.identity(user),
        randomList=deno.identity(random_list),
    )
