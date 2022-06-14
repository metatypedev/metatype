from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import worker
from typegraph.materializers.graphql import GraphQLRuntime

from typegraph.types import typedefs as t

with TypeGraph("mini") as g:

    remote = GraphQLRuntime("https://graphqlzero.almansi.me/api")

    allow_all = t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(lambda args: True),
            "policy",
        ),
    ).named("allow_all_policy")

    post = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "body": t.string(),
        }
    ).named("Post")

    getter = (
        remote.query(
            t.struct({"id": t.integer()}),
            t.optional(post)
        )
        .add_policy(allow_all)
    )

    g.expose(post=getter)
