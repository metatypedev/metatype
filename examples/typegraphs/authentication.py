# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Auth, Cors
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def authentication(g: Graph):
    # skip:end
    deno = DenoRuntime()
    ctx = t.struct({"username": t.string().optional()})

    # highlight-start
    # expects a secret in metatype.yml
    # `BASIC_[username]`
    # highlight-next-line
    g.auth(Auth.basic(["andim"]))
    # highlight-end

    g.expose(
        Policy.public(),
        get_context=deno.identity(ctx).apply(
            {
                "username": g.from_context("username"),
            },
        ),
        get_full_context=deno.func(
            t.struct({}),
            t.string(),
            code="(_: any, ctx: any) => Deno.inspect(ctx.context)",
        ),
    )
