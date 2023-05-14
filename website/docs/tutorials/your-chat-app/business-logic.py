# skip:start

from typegraph import TypeGraph, policies, t
from typegraph.graph.auth.oauth2 import github_auth
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import ModuleMat
from typegraph.runtimes.graphql import GraphQLRuntime

# isort: off
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.joinpath("import-your-existing-apis")))
from google import import_googleapi  # noqa: E402

# isort: on

# skip:end

with TypeGraph(
    "business-logic",
    cors=TypeGraph.Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
        allow_headers=["authorization"],
    ),
    auths=[
        github_auth,
    ],
) as g:
    db = PrismaRuntime("database", "POSTGRES_CONN")
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    googleapi = import_googleapi()

    public = policies.public()
    gh_user = policies.jwt("user", "type")
    # highlight-next-line
    internal = policies.internal()

    user = t.struct({"id": t.integer(), "name": t.string()})

    message = t.struct(
        {
            "id": t.integer().config("id", "auto"),
            "title": t.string(),
            "user_id": t.integer().named("uid"),
            "user": gql.query(  # 1
                t.struct({"id": t.integer().from_parent(g("uid"))}),  # 2
                t.optional(user),
            ),
        }
    ).named("message")

    # highlight-start
    g.expose(
        list_messages=db.find_many(message),
        emit_new_message=t.func(
            t.struct({"title": t.string()}), t.boolean(), ModuleMat("business-logic.ts")
        ),
        default_policy=[gh_user],
    )
    # highlight-end

    g.expose(
        create_message=db.create(message),
        send_notification=googleapi.functions["projectsMessagesSend"],
        list_users=gql.query(t.struct({}), t.struct({"data": t.array(user)})),
        default_policy=[internal],
    )
