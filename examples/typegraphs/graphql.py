# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.providers.prisma import PrismaRuntime

# isort: off
# skip:end
# highlight-next-line
from typegraph.runtimes.graphql import GraphQLRuntime


@typegraph(
    # skip:start
    cors=Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
    ),
    # skip:end
)
def graphql(g: Graph):
    db = PrismaRuntime("database", "POSTGRES_CONN")
    # highlight-next-line
    gql = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    public = Policy.public()

    # highlight-next-line
    user = t.struct({"id": t.string(), "name": t.string()}, name="User")

    message = t.struct(
        {
            "id": t.integer(as_id=True, config=["auto"]),
            "title": t.string(),
            # highlight-next-line
            "user_id": t.string(),
            # highlight-next-line
            "user": gql.query(
                t.struct(
                    {
                        # highlight-next-line
                        "id": t.string(as_id=True).from_parent("user_id"),
                    },
                ),
                t.optional(user),
            ),
        },
        name="message",
    )

    g.expose(
        public,
        create_message=db.create(message),
        messages=db.find_many(message),
        # highlight-next-line
        users=gql.query(t.struct({}), t.struct({"data": t.list(user)})),
    )
