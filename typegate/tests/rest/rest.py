from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("blog") as g:

    remote = HTTPRuntime("https://blog.example.com/api")

    allow_all = policies.allow_all()

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
        "/posts/{id}", t.struct({"id": t.integer()}), t.optional(g("Post"))
    ).add_policy(allow_all)

    update_post = remote.patch(
        "/posts/{id}", t.struct({"id": t.integer(), "content": t.string()}), g("Post")
    ).add_policy(allow_all)

    approve_post = remote.put(
        "posts/{id}/approved",
        t.struct({"id": t.integer(), "approved": t.boolean(), "authToken": t.string()}),
        t.struct({"approved": t.boolean()}),
        auth_token_field="authToken",
    ).add_policy(allow_all)

    get_posts = remote.get("/posts", t.struct({}), t.array(g("Post"))).add_policy(
        allow_all
    )

    get_posts_by_tags = remote.get(
        "/posts", t.struct({"tags": t.array(t.string())}), t.array(g("Post"))
    ).add_policy(allow_all)

    delete_post = remote.delete(
        "/posts/{postId}",
        t.struct({"postId": t.integer()}),
        t.struct({"postId": t.integer()}),
    ).add_policy(allow_all)

    get_comments = remote.get(
        "/comments", t.struct({"postId": t.integer()}), t.array(g("Comment"))
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
        updatePost=update_post,
        approvePost=approve_post,
        posts=get_posts,
        postsByTags=get_posts_by_tags,
        comments=get_comments,
        postComment=post_comment,
        replaceComment=replace_comment,
        deleteComment=delete_comment,
    )
