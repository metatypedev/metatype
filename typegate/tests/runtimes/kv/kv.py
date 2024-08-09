# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.kv import KvRuntime


@typegraph()
def kv(g: Graph):
    kv = KvRuntime("REDIS")

    g.expose(
        Policy.public(),
        get=kv.get(),
        set=kv.set(),
        delete=kv.delete(),
        keys=kv.keys(),
        values=kv.values(),
    )
