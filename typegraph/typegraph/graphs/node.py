# Copyright Metatype under the Elastic License 2.0.

from typing import Any
from typing import Dict
from typing import List

from ordered_set import OrderedSet


class Node:
    collector_target: str

    def __init__(self, collector_target: str):
        self.collector_target = collector_target

    @property
    def edges(self) -> List["Node"]:
        return []

    def data(self, collector: "Collector") -> dict:
        return {}


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
