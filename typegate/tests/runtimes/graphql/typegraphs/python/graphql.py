from typegraph_next import t, typegraph, effects, Policy
from typegraph_next.runtimes.graphql import GraphQLRuntime

user = t.struct(
    {
        "id": t.integer(),
    },
    name="User",
)

with typegraph(name="graphql") as expose:
    graphql = GraphQLRuntime("https://example.com/api/graphql")
    public = Policy.public()

    expose(
        user=graphql.query(t.struct({"id": t.integer()}), user).with_policy(public),
        createUser=graphql.mutation(
            t.struct({"id": t.integer()}), user, effects.create(False)
        ).with_policy(public),
    )
