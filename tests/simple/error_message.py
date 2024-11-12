# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, effects, t, typegraph
from typegraph.runtimes import DenoRuntime


@typegraph()
def error_message(g: Graph):
    deno = DenoRuntime()
    user = t.struct({"id": t.integer(), "name": t.string()})
    g.expose(
        returnSelf=deno.identity(user.rename("A")).with_policy(Policy.public()),
        returnSelfQuery=deno.identity(user.rename("B")).with_policy(Policy.public()),
        returnSelfMutation=deno.func(
            user.rename("InputC"),
            user.rename("OutputC"),
            code="(x) => x",
            effect=effects.create(),
        ).with_policy(Policy.public()),
    )
