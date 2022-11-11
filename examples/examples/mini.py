from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.graphql import GraphQLRuntime
from typegraph.policies import Policy
from typegraph.types import types as t

with TypeGraph("mini") as g:

    remote = GraphQLRuntime("https://graphqlzero.almansi.me/api")

    allow_all = Policy(
        FunMat.from_lambda(lambda args: True),
    ).named("allow_all_policy")

    post = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "body": t.string(),
        }
    ).named("Post")

    getter = remote.query(t.struct({"id": t.integer()}), t.optional(post)).add_policy(
        allow_all
    )

    g.expose(post=getter)
