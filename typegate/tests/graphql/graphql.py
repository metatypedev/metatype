from typegraph import TypeGraph, effects, policies, t
from typegraph.runtimes.graphql import GraphQLRuntime

with TypeGraph("graphql") as g:
    gql = GraphQLRuntime("https://example.com/api/graphql")

    user = t.struct(
        {
            "id": t.integer(),
            "email": t.string(),
            "name": t.string(),
        }
    ).named("User")

    user_by_id = gql.query(t.struct({"id": t.integer()}), g("User")).add_policy(
        policies.public()
    )
    update_user = gql.mutation(
        t.struct(
            {
                "id": t.integer(),
                "patch": t.struct(
                    {
                        "name": t.string().optional(),
                        "email": t.string().optional(),
                    }
                )
                .min(1)
                .named("UserUpdate"),
            }
        ),
        g("User"),
        effect=effects.update(idempotent=True),
    ).add_policy(policies.public())

    g.expose(user=user_by_id, updateUser=update_user)
