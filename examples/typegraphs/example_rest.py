# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    dynamic=False,
)
def example_rest(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    user = t.struct({"id": t.integer()}, name="User")

    post = t.struct(
        {
            "id": t.integer(),
            "author": user,
        },
        name="Post",
    )
    # skip:end

    g.expose(
        postFromUser=deno.func(
            user,
            post,
            code="(_) => ({ id: 12, author: {id: 1}  })",
        ).with_policy(pub),
    )

    # In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..
    # highlight-start
    g.rest(
        """
        query get_post($id: Integer) {
            postFromUser(id: $id) {
                id
                author {
                    id
                }
            }
        }
        """,
    )
    # highlight-end
