from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime

from typegraph import Graph, Policy, effects, t, typegraph

_user = t.struct(
    {"id": t.string(as_id=True), "name": t.string()},
    name="User",
)

create_user_input = t.struct(
    {
        "name": t.string(),
        "username": t.string(),
        "email": t.string(),
    },
    name="CreateUserInput",
)


@typegraph()
def graphql(g: Graph):
    graphql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = Policy.public()
    db = PrismaRuntime("graphql", "POSTGRES")

    message = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "title": t.string(),
            "user_id": t.string(name="uid"),
            "user": graphql.query(
                t.struct({"id": t.string(as_id=True).from_parent("uid")}),
                t.optional(_user),
            ),
        },
        name="message",
    )

    g.expose(
        user=graphql.query(
            t.struct({"id": t.string(as_id=True)}),
            _user,
        ).with_policy(public),
        users=graphql.query(
            t.struct({}),
            t.struct(
                {"data": t.list(_user)},
            ),
        ).with_policy(public),
        createUser=graphql.mutation(
            t.struct(
                {
                    "input": create_user_input,
                }
            ),
            _user,
            effects.create(False),
        ).with_policy(public),
        create_message=db.create(message).with_policy(public),
        messages=db.find_many(message).with_policy(public),
    )
