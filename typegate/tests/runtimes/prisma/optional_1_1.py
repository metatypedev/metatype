from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    user = t.struct(
        {
            "id": t.integer().as_id,
            "profile": db.link(g("Profile").optional(), "userProfile"),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.integer().as_id,
            "user": db.link(g("User").optional(), "userProfile", fkey=True),
        }
    ).named("Profile")

    g.expose(
        createUser=db.create(user),
        updateUser=db.update(user),
        findUniqueProfile=db.find_unique(profile),
        deleteUser=db.delete(user),
        default_policy=public,
    )
