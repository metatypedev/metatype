# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import re

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def policies_jwt(g: Graph):
    deno = DenoRuntime()

    some_policy = Policy.context("user.name", "some role")
    regex_policy = Policy.context("user.name", re.compile("[ab]{1}dmin"))

    g.auth(Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}}))

    g.expose(
        sayHelloWorld=deno.func(
            t.struct({}),
            t.string(),
            code="""() => "Hello World!" """,
        ).with_policy(some_policy),
        sayHelloRegexWorld=deno.func(
            t.struct({}), t.string(), code="""() => "Hello World!" """
        ).with_policy(regex_policy),
    )
