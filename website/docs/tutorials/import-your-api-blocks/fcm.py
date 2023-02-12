# skip:start
import google  # noqa: F401

from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.graphql import GraphQLRuntime

# skip:end
# highlight-next-line


with TypeGraph(
    "fcm",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = policies.public()

    user = t.struct({"id": t.integer(), "name": t.string()})

    message = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "title": t.string(),
            "user_id": t.integer().named("uid"),
            "user": gql.query(  # 1
                {"id": t.integer().from_parent(g("uid"))},  # 2
                t.optional(user),
            ),
        }
    ).named("message")
    db.manage(message)  # soon removed

    g.expose(
        create_message=db.insert_one(message),
        list_messages=db.find_many(message),
        list_users=gql.query({}, t.struct({"data": t.array(user)})),
        send_notification=t.func(
            t.struct(
                {
                    "parent": t.string(),
                }
            ).compose(google.MessageIn),
            google.MessageOut,
            google.RestMat(
                "POST",
                "https://fcm.googleapis.com/v1/{+parent}/messages:send",
                # highlight-next-line
                effect=effects.create(),
            ),
        ),
        default_policy=[public],
    )
