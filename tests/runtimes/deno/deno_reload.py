# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def deno_reload(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        fire=deno.import_(
            t.struct({}),
            t.float(),
            module=os.environ["DYNAMIC"],
            name="fire",
        ).with_policy(public),
    )
