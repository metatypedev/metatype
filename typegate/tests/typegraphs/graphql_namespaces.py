from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.types import types as t

with TypeGraph("graphql_namespaces") as g:
    gql = GraphQLRuntime("https://example.com/api/graphql")

    user_id = t.uuid().named("user_id")
    user_model = t.struct({"id": user_id, "name": t.string()}).named("user_model")

    picture_model = t.struct({"id": user_id, "url": t.uri()}).named("picture_model")

    user = (
        t.struct(
            {
                # operations under `user` namespace
                "find": gql.query(t.struct({"id": user_id}), user_model),
                "update": gql.mutation(user_model, user_model),
                # operations in nested namespace `user.profile`
                "profile": t.struct(
                    {
                        "picture": gql.query(t.struct({"id": user_id}), picture_model),
                        "setPicture": gql.mutation(picture_model, picture_model),
                    }
                ).named("profile_namespace"),
            }
        )
        .named("user_namespace")
        .add_policy(policies.allow_all())
    )

    g.expose(user=user)
