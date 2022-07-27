from os import environ

from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.prisma import PrismaRuntime
from typegraph.types import typedefs as t

postgres = environ.get(
    "TEST_POSTGRES_DB",
    "postgresql://postgres:password@localhost:5432/db?schema=test",
)

with TypeGraph("prisma") as g:

    db = PrismaRuntime(postgres)

    allow_all = policies.allow_all()

    userProfile = db.one_to_one(g("User"), g("Profile")).named("userProfile")

    user = t.struct(
        {
            "id": t.integer().id,
            "profile": userProfile.owned(),
        }
    ).named("User")

    profile = t.struct(
        {
            "id": t.integer().id,
            "user": userProfile.owner(),
        }
    ).named("Profile")

    db.manage(user)
    db.manage(profile)

    g.expose(
        **db.gen(
            {
                "queryRaw": (t.struct(), "queryRaw", allow_all),
                "executeRaw": (t.struct(), "executeRaw", allow_all),
                "createUser": (user, "create", allow_all),
                "updateUser": (user, "update", allow_all),
                "findUniqueProfile": (profile, "findUnique", allow_all),
                "deleteUser": (user, "delete", allow_all),
            }
        )
    )
