# skip:start
from typegraph import TypeGraph, effects, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# isort: off
import sys
from pathlib import Path
from typegraph.runtimes.graphql import GraphQLRuntime

from typegraph.runtimes.http import HTTPRuntime

sys.path.append(str(Path(__file__).parent))
# skip:end
# highlight-next-line
import google  # noqa: E402

# skip:next-line
# isort: on
with TypeGraph(
    "fcm",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = policies.public()

    user = t.struct({"id": t.integer(), "name": t.string()}).named("user")

    message = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "title": t.string(),
            # AssertionError: Type f'function' not supported
            # "user": gql.query(
            #     # input
            #     t.struct({"id": t.integer().from_parent(g("user"))}),
            #     # output
            #     user.optional(),
            # ).optional(),
        }
    ).named("message")

    remote = HTTPRuntime("https://fcm.googleapis.com/v1")
    g.expose(
        create_message=db.create(message),
        list_messages=db.find_many(message),
        users=gql.query(t.struct({}), t.struct({"data": t.array(user)})),
        user=gql.query(t.struct({"id": t.integer()}), user),
        send_notification=remote.post(
            "/{+parent}/messages:send",
            t.struct(
                {
                    "parent": t.string(),
                }
            ).compose(google.message_in.props),
            google.message_out,
            effect=effects.create(),
        ).named("fcm.projects.messages.send"),
        default_policy=[public],
    )
