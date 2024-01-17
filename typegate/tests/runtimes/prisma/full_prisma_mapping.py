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
            "coinflips": t.list(t.boolean()),
            "city": t.string(),
            "posts": t.list(g.ref("Post")),
            "extended_profile": g.ref("ExtendedProfile").optional(),
            "comments": t.list(g.ref("Comment")),
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
            "author": g.ref("User"),
            "comments": t.list(g.ref("Comment")),
        },
        name="Post",
    )

    comment = t.struct(
        {
            "id": t.integer(as_id=True),
            "content": t.string(),
            "related_post": g.ref("Post"),
            "author": g.ref("User"),
        },
        name="Comment",
    )

    extended_profile = t.struct(
        {
            "bio": t.string(),
            "user": g.ref("User"),
        },
        config={"id": ["user"]},
        name="ExtendedProfile",
    )

    g.expose(
        public,
        findManyUsers=db.find_many(user),
        findUniqueUser=db.find_unique(user),
        findFirstUser=db.find_first(user),
        createOneUser=db.create(user),
        createManyUsers=db.create_many(user),
        updateUser=db.update(user),
        upsertOneUser=db.upsert(user),
        findManyPosts=db.find_many(post),
        findCommentersOfCurrentUser=db.find_many(user).reduce(
            {
                "where": {
                    "comments": {
                        "some": {"author": {"id": g.inherit().from_context("user_id")}}
                    }
                }
            }
        ),
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
        findFirstPostWithReduce=db.find_first(post).reduce(
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
                    "idlist": t.list(t.integer()),
                }
            ),
            t.list(
                t.struct(
                    {
                        "id": t.integer(),
                        "title": t.string(),
                        "reactions": t.integer(),
                    }
                )
            ),
        ).reduce(
            {
                "title": "%Title 2%",
                "one": 10002,
                "two": -1,
                "idlist": [10003, 10002, 10007],
            }
        ),
    )
