# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime

# isort: off
import sys
from pathlib import Path
from typegraph.runtimes.graphql import GraphQLRuntime

sys.path.append(str(Path(__file__).parent))
# skip:end
# highlight-next-line
from google import import_googleapi  # noqa: E402

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

    user = t.struct({"id": t.string(), "name": t.string()}).named("user")

    message = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "title": t.string(),
        }
    ).named("message")

    googleapi = import_googleapi()

    g.expose(
        create_message=db.insert_one(message),
        list_messages=db.find_many(message),
        users=gql.query(t.struct({}), t.struct({"data": t.array(user)})),
        user=gql.query(t.struct({"id": t.integer()}), user),
        **googleapi.functions,
        default_policy=[public],
    )
