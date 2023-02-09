# skip:start
import sys

import google
from typegraph import effects
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.auth.oauth2 import github_auth
from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime
from typegraph.runtimes.deno import ModuleMat
from typegraph.runtimes.graphql import GraphQLRuntime

sys.path.append("../import-your-api-blocks")

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
                {"id": t.integer().from_parent(g("uid"))},  # 2
                t.optional(user),
            ),
        }
    ).named("message")
    db.manage(message)  # soon removed

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
        create_message=db.insert_one(message),
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
                effect=effects.create(),
            ),
        ),
        list_users=gql.query({}, t.struct({"data": t.array(user)})),
        default_policy=[internal],
    )
