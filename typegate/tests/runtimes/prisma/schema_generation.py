from typegraph import TypeGraph, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("test-simple-model") as g1:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id.config("auto", hello="world"),
            "name": t.string(),
        }
    ).named("User")

    g1.expose(
        createUser=db.create(user),
    )

with TypeGraph("test-one-to-many") as g2:
    db = PrismaRuntime("test", "POSTGRES")

    user = t.struct(
        {
            "id": t.integer().as_id,
            "posts": db.link(t.array(g2("Post")), "postAuthor"),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().as_id,
            "author": db.link(g2("User"), "postAuthor"),
        }
    ).named("Post")

    g2.expose(
        createUser=db.create(user),
        createPost=db.create(post),
    )
