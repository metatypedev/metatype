from typegraph import typegraph, t, Graph, Policy
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime
from typegraph.runtimes.random import RandomRuntime


@typegraph()
def prisma(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")
    gql_1 = GraphQLRuntime("http://mocked/api")
    rand = RandomRuntime(seed=1)

    public = Policy.public()
    post = t.struct(
        {
            "id": t.string(),
            "title": t.string(),
        },
        name="Post",
    )

    user = t.struct(
        {
            "name": t.string(config={"gen": "name"}),
            "age": t.integer(config={"gen": "age", "type": "adult"}),
        },
        name="Album",
    )

    record = t.struct(
        {
            "id": t.integer(as_id=True, config={"auto": True}),
            "description": t.string(),
            "post": gql_1.query(
                t.struct({"id": t.string(as_id=True)}),
                t.optional(post),
            ),
            "user": rand.gen(user),
        },
        name="Record",
    )

    g.expose(
        createOneRecord=db.create(record),
        findUniqueRecord=db.find_unique(record),
        default_policy=public,
    )
