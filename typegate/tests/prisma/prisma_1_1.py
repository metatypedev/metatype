from typegraph import effects
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:

    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

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
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        createUser=db.create(user).add_policy(public),
        updateUser=db.update(user).add_policy(public),
        findUniqueProfile=db.find_unique(profile).add_policy(public),
        deleteUser=db.delete(user).add_policy(public),
    )
