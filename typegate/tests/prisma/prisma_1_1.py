from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    user = t.struct(
        {
            "id": t.integer().config("id"),
            "profile": db.link(g("Profile").optional(), "userProfile"),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.integer().config("id"),
            "user": db.link(g("User"), "userProfile"),
        }
    ).named("Profile")

    g.expose(
        dropSchema=db.raw_execute(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        createUser=db.create(user).add_policy(public),
        updateUser=db.update(user).add_policy(public),
        findUniqueProfile=db.find(profile).add_policy(public),
        deleteUser=db.delete(user).add_policy(public),
    )
