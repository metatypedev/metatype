from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime

from typegraph import Graph, Policy, effects, t, typegraph

_user = t.struct(
    {"id": t.string(as_id=True), "name": t.string()},
    name="User",
)

create_user_inp = t.struct(
    {"name": t.string(), "username": t.string(), "email": t.email()}
)


@typegraph()
def graphql(g: Graph):
    # graphql = GraphQLRuntime("https://example.com/api/graphql")
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = Policy.public()
    db = PrismaRuntime("graphql", "POSTGRES")

    message = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "title": t.string(),
            # highlight-next-line
            "user_id": t.string(name="uid"),
            # highlight-next-line
            "user": gql.query(
                t.struct(
                    {
                        # highlight-next-line
                        "id": t.string(as_id=True).from_parent("uid")
                    }
                ),
                t.optional(_user),
            ),
        },
        name="message",
    )

    g.expose(
        users=gql.query(
            t.struct(),
            t.struct(
                {"data": t.list(_user)},
            ),
        ).with_policy(public),
        user=gql.query(
            t.struct({"id": t.string(as_id=True)}),
            _user,
        ).with_policy(public),
        create_message=db.create(message).with_policy(public),
        create_user=gql.mutation(
            t.struct(
                {
                    "input": create_user_inp,
                }
            ),
            _user,
            effects.create(False),
        ).with_policy(public),
        messages=db.find_many(message).with_policy(public),
    )
