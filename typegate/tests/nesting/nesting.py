from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import types as t

with TypeGraph("nesting") as g:

    remote = HTTPRuntime("https://nesting.example.com/api")

    user = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
        }
    ).named("User")

    temp = t.struct({"id": t.integer()})

    string = t.string()

    post = t.struct(
        {
            "id": t.integer(),
            "authorId": t.integer().named("Post.authorId"),
            "author": remote.get(
                "/users/{id}",
                t.struct({"id": t.integer().from_parent(g("Post.authorId"))}),
                t.optional(g("User")),
            ),
            "title": t.string(),
            "summary": t.string(),
            "content": t.string(),
        }
    ).named("Post")

    user_by_id = remote.get(
        "/users/{id}", t.struct({"id": t.integer()}), t.optional(g("User"))
    ).add_policy(allow_all())

    post_by_id = remote.get(
        "/posts/{id}", t.struct({"id": t.integer()}), t.optional(g("Post"))
    ).add_policy(allow_all())

    g.expose(
        user=user_by_id,
        post=post_by_id,
    )
