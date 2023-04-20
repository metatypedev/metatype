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
            # Note:
            # * schema validation fails when min(.>=1).max(20) (2023/04/17)
            # * now it seems to work. ajv issues ? (2023/04/18)
            "firstname": t.string().min(2).max(20),
        },
    ).named("User")

    g.expose(
        dropSchema=db.raw_execute(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        findManyUsers=db.find_many(user).add_policy(public),
        findUniqueUser=db.find(user).add_policy(public),
        createOneUser=db.create(user).add_policy(public),
    )
