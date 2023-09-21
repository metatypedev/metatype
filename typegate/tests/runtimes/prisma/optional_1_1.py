from typegraph_next import typegraph, t, Graph, Policy
from typegraph_next.providers.prisma import PrismaRuntime


@typegraph()
def prisma(g: Graph):
    db = PrismaRuntime("prisma", "POSTGRES")

    public = Policy.public()

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "profile": db.link(t.ref("Profile").optional(), "userProfile"),
        },
        name="User",
    )

    profile = t.struct(
        {
            "id": t.integer(as_id=True),
            "user": db.link(t.ref("User").optional(), "userProfile", fkey=True),
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
