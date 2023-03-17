# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# isort: off
# skip:end
# highlight-next-line
from typegraph.runtimes.graphql import GraphQLRuntime

with TypeGraph(
    "graphql",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    # highlight-next-line
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = policies.public()

    user = t.struct({"id": t.integer(), "name": t.string()})

    message = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "title": t.string(),
            "user_id": t.integer().named("uid"),
            # highlight-next-line
            "user": gql.query(
                t.struct(
                    {
                        # highlight-next-line
                        "id": t.integer().from_parent(g("uid"))
                    }
                ),
                t.optional(user),
            ),
        }
    ).named("message")

    g.expose(
        create_message=db.insert_one(message),
        list_messages=db.find_many(message),
        list_users=gql.query(t.struct({}), t.struct({"data": t.array(user)})),
        default_policy=[public],
    )
