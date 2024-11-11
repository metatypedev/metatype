# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes import DenoRuntime


@typegraph()
def invalid_ref(g: Graph):
    public = Policy.public()
    deno = DenoRuntime()

    user = t.struct({"id": t.uuid(), "posts": t.list(g.ref("Post"))})

    g.expose(public, user=deno.identity(user))
