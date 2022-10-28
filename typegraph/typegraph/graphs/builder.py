# Copyright Metatype under the Elastic License 2.0.

from typing import Any
from typing import Dict
from typing import List

from frozendict import frozendict
from ordered_set import OrderedSet
import orjson
from typegraph.graphs.node import Node


class Collector:
    types = "types"
    runtimes = "runtimes"
    materializers = "materializers"
    policies = "policies"

    collects: Dict[str, OrderedSet]

    def __init__(self):
        self.collects = {}

    def collect(self, node: Node) -> int:
        c = node.collector_target

        if c not in self.collects:
            self.collects[c] = OrderedSet()

        return self.collects[c].add(node)


def build(root: Node) -> Collector:
    def visit(nodes: List[Any], collector: Collector):
        for node in nodes:
            collector.collect(node)
            visit(node.edges, collector)

    collector = Collector()
    visit([root], collector)

    return collector


def json_dumps(obj: Any):
    def default(obj):
        if isinstance(obj, frozendict):
            return dict(obj)

        raise TypeError

    return orjson.dumps(obj, default=default)
