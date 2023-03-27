from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

with TypeGraph("prisma") as g:
    # schema ref:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = policies.public()

    user = t.struct(
        {
            "id": t.integer().config("id"),
            "name": t.string(),
            "age": t.integer().optional(),
            "coinflips": t.array(t.boolean()),
            "city": t.string(),
            "posts": t.array(g("Post")),
            "extended_profile": g("ExtendedProfile").optional(),
        },
    ).named("User")

    post = t.struct(
        {
            "id": t.integer().config("id"),
            "title": t.string(),
            "views": t.integer(),
            "likes": t.integer(),
            "published": t.boolean(),
            "author": g("User"),
            "comments": t.array(g("Comment")),
        }
    ).named("Post")

    comment = t.struct(
        {
            "id": t.integer().config("id"),
            "content": t.string(),
            "related_post": g("Post"),
        }
    ).named("Comment")

    extended_profile = t.struct(
        {
            "id": t.integer().config("id"),
            "bio": t.string(),
            "user": g("User"),
        }
    ).named("ExtendedProfile")

    g.expose(
        dropSchema=db.executeRaw(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ).add_policy(public),
        findManyUsers=db.find_many(user).add_policy(public),
        findUniqueUser=db.find_unique(user).add_policy(public),
        createOneUser=db.create(user).add_policy(public),
        createManyUsers=db.create_many(user).add_policy(public),
        upsertOneUser=db.upsert(user).add_policy(public),
        findManyPosts=db.find_many(post).add_policy(public),
        findUniquePost=db.find_unique(post).add_policy(public),
        createManyPosts=db.create_many(post).add_policy(public),
        updateManyPosts=db.update_many(post).add_policy(public),
        groupByPost=db.group_by(post).add_policy(public),
        aggregatePost=db.aggregate(post).add_policy(public),
        createOnePost=db.create(post).add_policy(public),
        findManyExtendedProfile=db.find_many(extended_profile).add_policy(public),
        createOneExtendedProfile=db.create(extended_profile).add_policy(public),
        createOneComment=db.create(comment).add_policy(public),
    )
