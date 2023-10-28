from typegraph import Graph, Policy, t, typegraph
from typegraph.providers.prisma import PrismaRuntime


@typegraph()
def prisma_opt_1(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")

    public = Policy.public()

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "profile": db.link(g.ref("Profile").optional(), "userProfile"),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.integer(as_id=True),
            "user": db.link(g.ref("User").optional(), "userProfile", fkey=True),
        },
        name="Profile",
    )

    g.expose(
        createUser=db.create(user),
        updateUser=db.update(user),
        findUniqueProfile=db.find_unique(profile),
        deleteUser=db.delete(user),
        default_policy=public,
    )
