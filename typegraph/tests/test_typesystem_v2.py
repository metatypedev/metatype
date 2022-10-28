# Copyright Metatype under the Elastic License 2.0.

from typegraph.graphs.builder import json_dumps
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import types as t


with TypeGraph(
    "new",
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

    my_policy = t.policy(FunMat(""))

    posts = t.func(t.struct(), t.array(post).max(20), FunMat("")).named("posts")
    find_post = t.func(t.struct({"id": t.uuid()}), post.optional(), FunMat("")).named(
        "findPost"
    )

    g.query(posts=posts, findPost=find_post.add_policy(my_policy))

    create_post = t.func(
        t.struct(
            {
                "title": t.string().min(10).max(200),
                "content": t.string().min(100),
                "authorId": t.string().uuid(),
            }
        ),
        post,
        FunMat("", serial=True),
    )

    g.mutation(createPost=create_post)


print(json_dumps(g.build()).decode())
