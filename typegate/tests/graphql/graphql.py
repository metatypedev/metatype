from typegraph import typegraph, effects, Policy, t, Graph
from typegraph.runtimes.graphql import GraphQLRuntime


@typegraph()
def graphql(g: Graph):
    gql = GraphQLRuntime("https://example.com/api/graphql")

    _user = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
        },
        name="User",
    )

    user_by_id = gql.query(t.struct({"id": t.integer()}), g.ref("User")).with_policy(
        Policy.public()
    )
    update_user = gql.mutation(
        t.struct(
            {
                "id": t.integer(),
                "patch": t.struct(
                    {
                        "name": t.string().optional(),
                        "email": t.string().optional(),
                    },
                    min=1,
                    name="UserUpdate",
                ),
            }
        ),
        g.ref("User"),
        effect=effects.update(idempotent=True),
    ).with_policy(Policy.public())

    g.expose(user=user_by_id, updateUser=update_user)
