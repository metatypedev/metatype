from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    db = PrismaRuntime("prisma", "POSTGRES")

    public = policies.public()

    node = t.struct(
        {
            "name": t.string().min(0).config("id"),
            "prev": g("ListNode").optional().config("unique"),
            "next": g("ListNode").optional(),
        }
    ).named("ListNode")

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        createNode=db.create(node),
        findNode=db.find_many(node),
        default_policy=[public],
    )
