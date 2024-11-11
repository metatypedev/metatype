# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def policies_jwt_format(g: Graph):
    deno = DenoRuntime()
    some_policy = Policy.context("role", "myrole")

    g.auth(Auth.hmac256("native"))
    g.expose(
        sayHelloWorld=deno.func(
            t.struct({}),
            t.string(),
            code="""() => "Hello World!" """,
        ).with_policy(some_policy),
    )
