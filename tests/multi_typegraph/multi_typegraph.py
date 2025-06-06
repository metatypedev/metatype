# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph
from typegraph.runtimes.http import HttpRuntime


@typegraph()
def http_py(g: Graph):
    remote = HttpRuntime("http://localhost/api")

    public = Policy.public()

    post = t.struct(
        {
            "id": t.integer(),
            "authorId": t.string(),
            "title": t.string(),
            "summary": t.string(),
            "content": t.string(),
        },
        name="Post",
    )

    comment = t.struct(
        {
            "id": t.integer(),
            "postId": t.integer(),
            "content": t.string(),
        },
        name="Comment",
    )

    post_by_id = remote.get(
        "/posts/{id}", t.struct({"id": t.integer()}), t.optional(g.ref("Post"))
    ).with_policy(public)

    update_post = remote.patch(
        "/posts/{id}",
        t.struct({"id": t.integer(), "content": t.string()}),
        post,
    ).with_policy(public)

    approve_post = remote.put(
        "posts/{id}/approved",
        t.struct({"id": t.integer(), "approved": t.boolean(), "authToken": t.string()}),
        t.struct({"approved": t.boolean()}),
        auth_token_field="authToken",
    ).with_policy(public)

    get_posts = remote.get("/posts", t.struct({}), t.list(g.ref("Post"))).with_policy(
        public
    )

    get_posts_by_tags = remote.get(
        "/posts", t.struct({"tags": t.list(t.string())}), t.list(g.ref("Post"))
    ).with_policy(public)

    delete_post = remote.delete(
        "/posts/{postId}",
        t.struct({"postId": t.integer()}),
        t.struct({"postId": t.integer()}),
    ).with_policy(public)

    get_comments = remote.get(
        "/comments", t.struct({"postId": t.integer()}), t.list(g.ref("Comment"))
    ).with_policy(public)

    post_comment = remote.post(
        "/comments",
        t.struct({"postId": t.integer(), "content": t.string()}),
        g.ref("Comment"),
        query_fields=("postId",),
    ).with_policy(public)

    replace_comment = remote.put(
        "/comments/{id}",
        comment,
        comment,
    ).with_policy(public)

    delete_comment = remote.delete(
        "/comments/{id}", t.struct({"id": t.integer()}), t.boolean()
    ).with_policy(public)

    g.expose(
        post=post_by_id,
        updatePost=update_post,
        approvePost=approve_post,
        posts=get_posts,
        postsByTags=get_posts_by_tags,
        deletePost=delete_post,
        comments=get_comments,
        postComment=post_comment,
        replaceComment=replace_comment,
        deleteComment=delete_comment,
    )


def square(num: int) -> int:
    return num**2


@typegraph()
def deno(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        simple=deno.func(
            t.struct({"a": t.float(), "b": t.float()}),
            t.float(),
            code="({ a, b }) => a + b",
        ),
    )
