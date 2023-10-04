from typegraph import typegraph, Policy, t, Graph
from typegraph.gen.exports.runtimes import EffectUpdate
from typegraph.providers.prisma import PrismaRuntime


@typegraph()
def prisma(g: Graph):
    # schema ref:
    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference

    db = PrismaRuntime("prisma", "POSTGRES")
    public = Policy.public()

    user = t.struct(
        {
            "id": t.integer(as_id=True),
            "name": t.string(),
            "age": t.integer().optional(),
            "coinflips": t.array(t.boolean()),
            "city": t.string(),
            "posts": t.array(t.ref("Post")),
            "extended_profile": t.ref("ExtendedProfile").optional(),
        },
        name="User",
    )

    post = t.struct(
        {
            "id": t.integer(as_id=True),
            "title": t.string(),
            "views": t.integer(),
            "likes": t.integer(),
            "published": t.boolean(),
            "author": t.ref("User"),
            "comments": t.array(t.ref("Comment")),
        },
        name="Post",
    )

    comment = t.struct(
        {
            "id": t.integer(as_id=True),
            "content": t.string(),
            "related_post": t.ref("Post"),
        },
        name="Comment",
    )

    extended_profile = t.struct(
        {
            "id": t.integer(as_id=True),
            "bio": t.string(),
            "user": t.ref("User"),
        },
        name="ExtendedProfile",
    )

    g.expose(
        public,
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
        findFirstPostWithApply=db.find_first(post).apply(
            {
                "where": {"id": 10007},
            }
        ),
        testExecuteRaw=db.execute(
            'UPDATE "Post" SET title = ${replacement} WHERE title LIKE ${title}',
            t.struct(
                {
                    "title": t.string().set("%Title 2%"),
                    "replacement": t.string(),
                }
            ),
            EffectUpdate(True),
        ),
        # https://www.postgresql.org/docs/10/functions-subquery.html
        # expr = ANY(array) equiv. to expr IN (array[0], array[1], ..)
        testQueryRaw=db.query_raw(
            """
                WITH tmp AS (
                    SELECT id, title, (views + likes) as reactions FROM "Post"
                    WHERE title LIKE ${title} AND id = ANY(${idlist})
                ) SELECT * FROM tmp WHERE id IN (${one}, ${two})
            """,
            t.struct(
                {
                    "one": t.integer(),
                    "two": t.integer(),
                    "title": t.string(),
                    "idlist": t.array(t.integer()),
                }
            ),
            t.array(
                t.struct(
                    {
                        "id": t.integer(),
                        "title": t.string(),
                        "reactions": t.integer(),
                    }
                )
            ),
        ).apply(
            {
                "title": "%Title 2%",
                "one": 10002,
                "two": -1,
                "idlist": [10003, 10002, 10007],
            }
        ),
    )
