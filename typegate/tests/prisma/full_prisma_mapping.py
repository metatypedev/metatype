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
        dropSchema=db.raw_execute(
            "DROP SCHEMA IF EXISTS test CASCADE", effect=effects.delete()
        ),
        findManyUsers=db.find_many(user),
        findUniqueUser=db.find_unique(user),
        findFirstUser=db.find_first(user),
        createOneUser=db.create(user),
        createManyUsers=db.create_many(user),
        upsertOneUser=db.upsert(user),
        findManyPosts=db.find_many(post),
        findFirstPost=db.find_first(post),
        findFirstComment=db.find_first(comment),
        findUniquePost=db.find_unique(post),
        createManyPosts=db.create_many(post),
        updateManyPosts=db.update_many(post),
        groupByPost=db.group_by(post),
        aggregatePost=db.aggregate(post),
        createOnePost=db.create(post),
        findManyExtendedProfile=db.find_many(extended_profile),
        createOneExtendedProfile=db.create(extended_profile),
        createOneComment=db.create(comment),
        default_policy=[public],
    )
