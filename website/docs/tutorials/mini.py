from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.graphql import GraphQLRuntime

with TypeGraph("mini2") as g:

    remote = GraphQLRuntime("https://graphqlzero.almansi.me/api")

    public = policies.public()

    post = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "body": t.string(),
        }
    ).named("Post")

    getter = remote.query(t.struct({"id": t.integer()}), t.optional(post)).add_policy(
        public
    )

    g.expose(post=getter)
