from typegraph import typegraph, effects, Policy, t, Graph
from typegraph.runtimes.graphql import GraphQLRuntime


@typegraph(name="graphql_namespaces")
def graphql_namespaces(g: Graph):
    gql = GraphQLRuntime("https://example.com/api/graphql")

    user_id = t.string(as_id=True, name="UserId")
    user_model = t.struct({"id": user_id, "name": t.string()}, name="User")

    picture_model = t.struct({"id": user_id, "url": t.uri()}, name="Picture")

    public = Policy.public()

    user = t.struct(
        {
            # operations under `user` namespace
            "find": gql.query(
                t.struct({"id": user_id}), user_model, path=("findUser",)
            ).with_policy(public),
            "update": gql.mutation(
                user_model,
                user_model,
                path=("updateUser",),
                effect=effects.update(True),
            ).with_policy(public),
            # operations in nested namespace `user.profile`
            "profile": t.struct(
                {
                    "picture": gql.query(
                        t.struct({"id": user_id}),
                        picture_model,
                        path=("profile", "picture"),
                    ).with_policy(public),
                    "setPicture": gql.mutation(
                        picture_model,
                        picture_model,
                        path=("profile", "setPicture"),
                        effect=effects.update(True),
                    ).with_policy(public),
                },
                name="ProfileNamespace",
            ),
        },
        name="UserNamespace",
    ).with_policy(public)

    g.expose(user=user)
