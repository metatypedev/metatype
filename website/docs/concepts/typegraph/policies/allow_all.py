from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.types import types as t

with TypeGraph("allow_all") as g:

    remote = GraphQLRuntime("https://graphqlzero.almansi.me/api")
    allow_all = policies.allow_all()

    post = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "body": t.string(),
        }
    ).named("Post")

    getter = remote.query(t.struct({"id": t.integer()}), t.optional(post)).add_policy(
        policies.allow_all()
    )

    g.expose(post=getter)
