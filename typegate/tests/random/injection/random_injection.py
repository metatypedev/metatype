from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import Graph, t, typegraph


@typegraph()
def random_injection(g: Graph):
    pub = Policy.public()
    deno = DenoRuntime()

    user = t.struct(
        {
            "id": t.uuid().from_random(),
            "ean": t.ean().from_random(),
            "name": t.string(config={"gen": "name"}).from_random(),
            "age": t.integer(config={"gen": "age", "type": "adult"}).from_random(),
            "married": t.boolean().from_random(),
            "birthday": t.datetime().from_random(),
            "friends": t.list(t.string(config={"gen": "first"})).from_random(),
            "phone": t.string(config={"gen": "phone"}).from_random(),
            "gender": t.string(config={"gen": "gender"}).from_random(),
            "firstname": t.string(config={"gen": "first"}).from_random(),
            "lastname": t.string(config={"gen": "last"}).from_random(),
            "occupation": t.string(config={"gen": "profession"}).from_random(),
            "street": t.string(config={"gen": "address"}).from_random(),
            "city": t.string(config={"gen": "city"}).from_random(),
            "postcode": t.string(config={"gen": "postcode"}).from_random(),
            "country": t.string(
                config={"gen": "country", "full": "true"}
            ).from_random(),
            "uri": t.uri().from_random(),
            "hostname": t.string(format="hostname").from_random(),
        }
    )

    random_list = t.struct(
        {
            "names": t.list(t.string(config={"gen": "name"})).from_random(),
        }
    )

    g.expose(
        pub,
        randomUser=deno.identity(user),
        randomList=deno.identity(random_list),
    )
