from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph(dynamic=False)
def example_rest(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    user = t.struct({"id": t.integer()}, name="User")

    post = t.struct(
        {
            "id": t.integer(),
            "author": user,
        },
        name="Post",
    )

    # API docs {typegate_url}/example-rest/rest
    # In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..
    g.rest(
        """
        query get_post($id: Integer) {
            postFromUser(id: $id) {
                id
                author {
                    id
                }
            }
        }
        """
    )

    g.expose(
        postFromUser=deno.func(
            user,
            post,
            code="(_) => ({ id: 12, author: {id: 1}  })",
        ).with_policy(pub),
    )
