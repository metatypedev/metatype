from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.http import HttpRuntime


@typegraph()
def blog(g: Graph):
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
