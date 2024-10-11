from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.http import HttpRuntime


@typegraph()
def nesting(g: Graph):
    remote = HttpRuntime("https://nesting.example.com/api")

    public = Policy.public()

    _user = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
        },
        name="User",
    )

    _temp = t.struct({"id": t.integer()})

    _string = t.string()

    _post = t.struct(
        {
            "id": t.integer(),
            "authorId": t.integer(),
            "author": remote.get(
                "/users/{id}",
                t.struct({"id": t.integer().from_parent("authorId")}),
                t.optional(g.ref("User")),
            ),
            "title": t.string(),
            "summary": t.string(),
            "content": t.string(),
        },
        name="Post",
    )

    user_by_id = remote.get(
        "/users/{id}", t.struct({"id": t.integer()}), t.optional(g.ref("User"))
    )

    post_by_id = remote.get(
        "/posts/{id}", t.struct({"id": t.integer()}), t.optional(g.ref("Post"))
    )

    g.expose(
        public,
        user=user_by_id,
        post=post_by_id,
    )
