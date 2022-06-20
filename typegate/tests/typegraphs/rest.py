from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import worker
from typegraph.materializers.http import HTTPRuntime
from typegraph.types import typedefs as t

with TypeGraph("blog") as g:

    remote = HTTPRuntime("https://blog.example.com/api")

    allow_all = t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(lambda args: True),
            "policy",
        ),
    ).named("allow_all_policy")

    post = t.struct(
        {
            "id": t.integer(),
            "authorId": t.string(),
            "title": t.string(),
            "summary": t.string(),
            "content": t.string(),
        }
    ).named("Post")

    comment = t.struct(
        {
            "id": t.integer(),
            "postId": t.integer(),
            "content": t.string(),
        }
    ).named("Comment")

    post_by_id = remote.get(
        "/posts/{id}", t.struct({"id": t.integer()}), g("Post")
    ).add_policy(allow_all)

    get_posts = remote.get("/posts", t.struct({}), t.list(g("Post"))).add_policy(
        allow_all
    )

    delete_post = remote.delete(
        "/posts/{postId}",
        t.struct({"postId": t.integer()}),
        t.struct({"postId": t.integer()}),
    ).add_policy(allow_all)

    get_comments = remote.get(
        "/comments", t.struct({"postId": t.integer()}), t.list(g("Comment"))
    ).add_policy(allow_all)

    post_comment = remote.post(
        "/comments",
        t.struct({"postId": t.integer(), "content": t.string()}),
        g("Comment"),
        query_fields=("postId",),
    ).add_policy(allow_all)

    replace_comment = remote.put(
        "/comments/{id}",
        g("Comment"),
        g("Comment"),
    ).add_policy(allow_all)

    delete_comment = remote.delete(
        "/comments/{id}", t.struct({"id": t.integer()}), t.boolean()
    ).add_policy(allow_all)

    g.expose(
        post=post_by_id,
        posts=get_posts,
        comments=get_comments,
        postComment=post_comment,
        replaceComment=replace_comment,
        deleteComment=delete_comment,
    )
