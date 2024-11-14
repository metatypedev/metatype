# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph(dynamic=False)
def rest_simple(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.rest(
        """
        query ping {
            ping
        }
        """
    )

    ping = deno.func(
        t.struct({}),
        t.integer(),
        code="() => 1",
    ).with_policy(pub)

    g.expose(
        ping=ping,
    )
