from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph(name="prisma") as g:
    db1 = PrismaRuntime("db1", "POSTGRES")
    db2 = PrismaRuntime("db2", "POSTGRES_2")

    user1 = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "name": t.string(),
        }
    ).named("test1_User")

    user2 = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "name": t.string(),
        }
    ).named("test2_User")

    public = policies.public()

    g.expose(
        dropSchema1=db1.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE",
            effect=effects.delete(idempotent=True),
        ).add_policy(public),
        dropSchema2=db2.executeRaw(
            "DROP SCHEMA IF EXISTS test2 CASCADE",
            effect=effects.delete(idempotent=True),
        ).add_policy(public),
        createUser1=db1.insert_one(user1).add_policy(public),
        findUniqueUser1=db1.find_unique(user1).add_policy(public),
        findManyUsers1=db1.find_many(user1).add_policy(public),
        createUser2=db2.insert_one(user2).add_policy(public),
        findUniqueUser2=db2.find_unique(user2).add_policy(public),
        findManyUsers2=db2.find_many(user2).add_policy(public),
    )
