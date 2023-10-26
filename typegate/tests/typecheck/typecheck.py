# Copyright Metatype under the Elastic License 2.0.

from typegraph import typegraph, effects, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def typecheck(g: Graph):
    deno = DenoRuntime()

    user = t.struct(
        {
            "id": t.uuid(),
            "username": t.string(min=4, max=63, pattern="^[a-z]+$"),
            "email": t.email(),
            "website": t.uri().optional(),
        },
        name="User",
    )

    create_user = deno.func(user, user, code="(a) => a", effect=effects.create())

    post = t.struct(
        {
            "id": t.uuid(),
            "title": t.string(min=10, max=200),
            "content": t.string(min=100),
            "published": t.boolean(),
            "author": user,
        },
        name="Post",
    )

    my_policy = Policy.public()

    tag = t.string(max=10)

    post_filter = t.struct(
        {
            "tag": t.union([tag, t.list(tag)]).optional(),
            "authorId": t.uuid().optional(),
            "search": t.either(
                [
                    t.struct({"title": t.either([t.string(min=3), t.string(max=10)])}),
                    t.struct(
                        {
                            "content": t.either(
                                [t.string(min=3), t.list(t.string(min=3), max=3)]
                            )
                        }
                    ),
                ]
            ).optional(),
        }
    )

    posts = deno.func(post_filter, t.list(post, max=20), code="() => []")
    find_post = deno.func(
        t.struct({"id": t.uuid()}), post.optional(), code="() => null"
    )

    create_post_code = "() => ({ title: 'Hello Metatype', content: 'Greeting from Metatype', authorId: 123})"

    create_post = deno.func(
        t.struct(
            {
                "title": t.string(min=10, max=200),
                "content": t.string(min=100),
                "authorId": t.uuid(),
                "tags": t.list(t.string(max=10), min=2).optional(),
            }
        ),
        post,
        code=create_post_code,
        effect=effects.create(),
    )

    enums = t.struct(
        {
            "userRole": t.enum(["admin", "moderator"]).optional(),
            "availableItems": t.list(
                t.struct(
                    {"name": t.string(), "unitPrice": t.float()},
                    enum=[
                        {"name": "banana", "unitPrice": 200},
                        {"name": "orange", "unitPrice": 300},
                        {"name": "apple", "unitPrice": 400},
                    ],
                    name="AvailableItem",
                ),
            ),
        }
    )

    product = t.struct(
        {
            "name": t.string(),
            "equivalent": t.list(g.ref("Product")).optional(),
            "score": t.either(
                [t.string(enum=["bad", "decent", "good"]), t.integer()]
            ).optional(),
        },
        name="Product",
    )

    g.expose(
        my_policy,
        createUser=create_user,
        posts=posts,
        findPost=find_post,
        createPost=create_post,
        enums=deno.identity(enums),
        findProduct=deno.identity(product),
    )
