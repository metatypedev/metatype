from typegraph import t, typegraph, effects, Policy, Graph
from typegraph.runtimes.graphql import GraphQLRuntime

user = t.struct(
    {
        "id": t.integer(),
    },
    name="User",
)


@typegraph()
def graphql(g: Graph):
    graphql = GraphQLRuntime("https://example.com/api/graphql")
    public = Policy.public()

    g.expose(
        user=graphql.query(t.struct({"id": t.integer()}), user).with_policy(public),
        createUser=graphql.mutation(
            t.struct({"id": t.integer()}), user, effects.create(False)
        ).with_policy(public),
    )
