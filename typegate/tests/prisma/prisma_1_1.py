from typegraph import Effect
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:

    db = PrismaRuntime("prisma", "POSTGRES")

    allow_all = policies.allow_all()

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
            "DROP SCHEMA IF EXISTS test CASCADE", effect=Effect.delete()
        ).add_policy(allow_all),
        **db.gen(
            {
                "createUser": (user, "create", allow_all),
                "updateUser": (user, "update", allow_all),
                "findUniqueProfile": (profile, "findUnique", allow_all),
                "deleteUser": (user, "delete", allow_all),
            }
        )
    )
