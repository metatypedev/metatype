from typegraph import effects
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    # schema model:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = policies.public()

    userPost = db.one_to_many(g("users"), g("posts")).named("userPost")
    postAuthor = db.one_to_one(g("posts"), g("users")).named("postAuthor")
    userExtendedProfile = db.one_to_one(g("users"), g("extendedProfiles")).named(
        "userExtendedProfile"
    )

    posts = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "title": t.string(),
            "published": t.boolean(),
            "author": postAuthor.owned(),
            "views": t.integer(),
            "likes": t.integer(),
        }
    )
    db.manage(posts)

    users = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "name": t.string(),
            "email": t.string(),
            "profileViews": t.integer(),
            "age": t.integer().optional(),
            "coinflips": t.array(t.boolean()),
            "city": t.string(),
            "posts": userPost.owner(),
            "extendedProfile": userExtendedProfile.owned().optional(),
        },
    ).named("users")
    db.manage(users)

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        **db.gen(
            {
                "findManyUsers": (users, "findMany", public),
                "createOneUser": (users, "create", public),
                "findManyPosts": (posts, "findMany", public),
                "createOnePost": (posts, "create", public),
            }
        )
    )
