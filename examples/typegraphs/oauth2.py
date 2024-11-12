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
def oauth2_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"exp": t.integer().optional()})

    # highlight-start
    g.auth(Auth.oauth2_github("openid profile email"))
    # highlight-end

    g.expose(
        public,
        get_context=deno.identity(ctx).apply(
            {
                "exp": g.from_context("exp"),
            },
        ),
    )
