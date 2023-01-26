from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.base import Effect
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
        policies.allow_all()
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
                ).min(1),
            }
        ),
        g("User"),
        effect=Effect.update(idempotent=True),
    ).add_policy(policies.allow_all())

    g.expose(user=user_by_id, updateUser=update_user)
