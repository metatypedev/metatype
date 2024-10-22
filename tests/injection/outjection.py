from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import RandomRuntime, DenoRuntime

@typegraph()
def outjection(g: Graph):
    deno = DenoRuntime()
    random = RandomRuntime()

    g.expose(
        Policy.public(),
        randomUser=deno.identity(t.struct()).extend({
            "id": t.uuid().from_random(),
            "age": t.integer().set(19),
            "email": t.email().from_context("user_email"),
            "password": t.string().from_secret("user_password"), ## should we allow this?
            "createdAt": t.date().inject("now"),
            "firstPost": random.gen(
                t.struct({
                    "title": t.string(),
                })
            ).extend({
                "publisherEmail": t.email().from_parent("email")
            })
        }),
    )

