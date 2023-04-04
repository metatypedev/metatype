from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")

    public = policies.public()
    post = t.struct(
        {
            "id": t.string(),
            "title": t.string(),
        },
    ).named("Post")
    record = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "description": t.string(),
            "post": gql.query(
                t.struct({"id": t.string()}),
                t.optional(post),
            ),
        },
    ).named("Record")

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        createOneRecord=db.insert_one(record).add_policy(public),
        findUniqueRecord=db.find_unique(record).add_policy(public),
    )
