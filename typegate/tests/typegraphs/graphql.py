from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.policies import allow_all
from typegraph.types import typedefs as t

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
        allow_all()
    )

    g.expose(user=user_by_id)
