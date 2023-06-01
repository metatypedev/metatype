from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime
from typegraph.runtimes.random import RandomMat, RandomRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")
    gql_1 = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    rand = RandomRuntime(seed=1)

    public = policies.public()
    post = t.struct(
        {
            "id": t.string(),
            "title": t.string(),
        },
    ).named("Post")
    user = t.struct(
        {
            "name": t.string().config(gen="name"),
            "age": t.integer().config(gen="age", type="adult"),
        }
    ).named("Album")
    record = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "description": t.string(),
            "post": gql_1.query(
                t.struct({"id": t.string().format("graphql-id")}),
                t.optional(post),
            ),
            "user": t.gen(user, RandomMat(runtime=rand)),
        },
    ).named("Record")

    g.expose(
        createOneRecord=db.create(record),
        findUniqueRecord=db.find_unique(record),
        default_policy=public,
    )
