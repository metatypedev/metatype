from typegraph import effects
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    # schema ref:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = policies.public()

    user_post = db.one_to_many(g("User"), g("Post")).named("UserPost")
    user_extended_profile = db.one_to_one(g("User"), g("ExtendedProfile")).named(
        "UserExtendedProfile"
    )

    user = t.struct(
        {
            "id": t.integer().config("id"),
            "name": t.string(),
            "age": t.integer().optional(),
            "coinflips": t.array(t.boolean()),
            "city": t.string(),
            "posts": user_post.owned(),
            "extended_profile": user_extended_profile.owned(),
        },
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().config("id"),
            "title": t.string(),
            "views": t.integer(),
            "likes": t.integer(),
            "published": t.boolean(),
            "author": user_post.owner(),
        }
    ).named("Post")

    extended_profile = t.struct(
        {
            "id": t.integer().config("id"),
            "bio": t.string(),
            "User": user_extended_profile.owner(),
        }
    ).named("ExtendedProfile")

    db.manage(user)
    db.manage(post)
    db.manage(extended_profile)

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        **db.gen(
            {
                "findManyUsers": (user, "findMany", public),
                "findUniqueUser": (user, "findUnique", public),
                "createOneUser": (user, "create", public),
                "findManyPosts": (post, "findMany", public),
                "findUniquePost": (post, "findUnique", public),
                "groupByPost": (post, "groupBy", public),
                "aggregatePost": (post, "aggregate", public),
                "createOnePost": (post, "create", public),
                "findManyExtendedProfile": (extended_profile, "findMany", public),
                "createOneExtendedProfile": (extended_profile, "create", public),
            }
        )
    )
