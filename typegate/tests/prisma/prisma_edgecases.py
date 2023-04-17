from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    # schema ref:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = policies.public()

    user = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "pseudo": t.string().config("unique"),
            "email": t.email(),
            # TODO: schema validation fails when min(.>=1).max(20) ?
            "firstname": t.string().min(0).max(20),
        },
    ).named("User")

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        findManyUsers=db.find_many(user).add_policy(public),
        findUniqueUser=db.find_unique(user).add_policy(public),
        createOneUser=db.create(user).add_policy(public),
    )
