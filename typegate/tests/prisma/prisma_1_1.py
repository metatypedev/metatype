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
            "profile": userProfile.owned(),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.integer().config("id"),
            "user": userProfile.owner(),
        }
    ).named("Profile")

    db.manage(user)
    db.manage(profile)

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        **db.gen(
            {
                "createUser": (user, "create", public),
                "updateUser": (user, "update", public),
                "findUniqueProfile": (profile, "findUnique", public),
                "deleteUser": (user, "delete", public),
            }
        )
    )
