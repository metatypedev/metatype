# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.kv import KvRuntime


@typegraph()
def kv_py(g: Graph):
    kv = KvRuntime("REDIS_HOST", "REDIS_PASSWORD")

    g.expose(
        Policy.public(),
        get=kv.get(),
        set=kv.set(),
        delete=kv.delete(),
        keys=kv.keys(),
        all=kv.all(),
    )
