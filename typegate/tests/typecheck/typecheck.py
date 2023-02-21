# Copyright Metatype under the Elastic License 2.0.

from typegraph import TypeGraph, effects, policies, t
from typegraph.runtimes.deno import FunMat, PureFunMat

with TypeGraph(
    "typecheck",
) as g:
    user = t.struct(
        {
            "id": t.uuid(),
            "username": t.string().min(4).max(63),
            "email": t.email(),
            "website": t.uri().optional(),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.uuid(),
            "title": t.string().min(10).max(200),
            "content": t.string().min(100),
            "published": t.boolean(),
            "author": user,
        }
    ).named("Post")

    my_policy = policies.public()

    posts = t.func(t.struct({}), t.array(post).max(20), PureFunMat("() => []")).named(
        "posts"
    )
    find_post = t.func(
        t.struct({"id": t.uuid()}), post.optional(), PureFunMat("() => null")
    ).named("findPost")

    create_post_mat = FunMat(
        "() => ({ title: 'Hello Metatype', content: 'Greeting from Metatype', authorId: 123})",
        effect=effects.create(),
    )

    create_post = t.func(
        t.struct(
            {
                "title": t.string().min(10).max(200),
                "content": t.string().min(100),
                "authorId": t.string().uuid(),
            }
        ),
        post,
        create_post_mat,
    )

    g.expose(
        posts=posts,
        findPost=find_post.add_policy(my_policy),
        createPost=create_post,
    )
