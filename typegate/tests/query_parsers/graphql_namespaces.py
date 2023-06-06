from typegraph import TypeGraph, effects, policies, t
from typegraph.runtimes.graphql import GraphQLRuntime

with TypeGraph("graphql_namespaces") as g:
    gql = GraphQLRuntime("https://example.com/api/graphql")

    user_id = t.string().id().named("user_id")
    user_model = t.struct({"id": user_id, "name": t.string()}).named("user_model")

    picture_model = t.struct({"id": user_id, "url": t.uri()}).named("picture_model")

    public = policies.public()
    user = (
        t.struct(
            {
                # operations under `user` namespace
                "find": gql.query(
                    t.struct({"id": user_id}), user_model, path=("findUser",)
                ).add_policy(public),
                "update": gql.mutation(
                    user_model,
                    user_model,
                    path=("updateUser",),
                    effect=effects.update(True),
                ).add_policy(public),
                # operations in nested namespace `user.profile`
                "profile": t.struct(
                    {
                        "picture": gql.query(
                            t.struct({"id": user_id}),
                            picture_model,
                            path=("profile", "picture"),
                        ).add_policy(public),
                        "setPicture": gql.mutation(
                            picture_model,
                            picture_model,
                            path=("profile", "setPicture"),
                            effect=effects.update(True),
                        ).add_policy(public),
                    }
                ).named("profile_namespace"),
            }
        )
        .named("user_namespace")
        .add_policy(public)
    ).add_policy(public)

    g.expose(user=user)
