from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes.http import HttpRuntime


@typegraph()
def nesting(g: Graph):
    remote = HttpRuntime("https://nesting.example.com/api")

    public = Policy.public()

    user = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
        },
        name="User",
    )

    temp = t.struct({"id": t.integer()})

    string = t.string()

    post = t.struct(
        {
            "id": t.integer(),
            "authorId": t.integer(name="Post_authorId"),
            "author": remote.get(
                "/users/{id}",
                t.struct({"id": t.integer().from_parent("Post_authorId")}),
                t.optional(t.ref("User")),
            ),
            "title": t.string(),
            "summary": t.string(),
            "content": t.string(),
        },
        name="Post",
    )

    user_by_id = remote.get(
        "/users/{id}", t.struct({"id": t.integer()}), t.optional(t.ref("User"))
    )

    post_by_id = remote.get(
        "/posts/{id}", t.struct({"id": t.integer()}), t.optional(t.ref("Post"))
    )

    g.expose(
        public,
        user=user_by_id,
        post=post_by_id,
    )
