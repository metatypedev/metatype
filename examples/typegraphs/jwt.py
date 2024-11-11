# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Auth, Cors
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def jwt_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"your_own_content": t.string().optional()})
    # highlight-next-line
    g.auth(Auth.hmac256("custom"))

    g.expose(
        get_context=deno.identity(ctx).apply(
            {
                "your_own_content": g.from_context("your_own_content"),
            },
        ),
        default_policy=[public],
    )
