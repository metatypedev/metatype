# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.kv import KvRuntime


@typegraph()
def kv(g: Graph):
    kv = KvRuntime(
        host="REDIS_HOST", password="REDIS_PASSWORD", db_number=None, port=None
    )

    g.expose(
        Policy.public(),
        get=kv.get(),
        set=kv.set(),
        delete=kv.delete(),
        keys=kv.keys(),
        all=kv.all(),
    )
