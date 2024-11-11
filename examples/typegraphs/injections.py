# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def injection_example(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.expose(
        get_injected=deno.func(
            t.struct(
                {
                    "static_value": t.integer().set(12),
                    "context_value": t.uuid().from_context("profile.userId"),
                    "secret_value": t.string().from_secret("secret_name"),
                    "dynamic_value": t.datetime().inject("now"),
                },
            ).rename("Input"),
            t.struct(
                {
                    "static_value": t.integer(),
                    "context_value": t.uuid(),
                    "secret_value": t.string(),
                    "nested": deno.identity(
                        t.struct(
                            {"parent_value": t.integer().from_parent("static_value")},
                        ),
                    ),
                    "dynamic_value": t.datetime(),
                },
            ).rename("Output"),
            code="""
            ({ static_value, context_value, secret_value, dynamic_value }) => ({ static_value, context_value, secret_value, dynamic_value })
            """,
        ).with_policy(pub),
    )
