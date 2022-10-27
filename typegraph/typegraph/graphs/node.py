# Copyright Metatype under the Elastic License 2.0.

from typing import Any
from typing import Dict
from typing import List

from ordered_set import OrderedSet


class Node:
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
        self.collects = {
            Collector.types: OrderedSet(),
            Collector.runtimes: OrderedSet(),
            Collector.materializers: OrderedSet(),
            Collector.policies: OrderedSet(),
        }

    def collect(self, node: Node) -> int:
        from typegraph.types import types as t
        from typegraph.materializers.base import Materializer, Runtime

        if isinstance(node, t.typedef):
            if isinstance(node, t.policy):
                return self.collects[Collector.policies].add(node)
            return self.collects[Collector.types].add(node)

        if isinstance(node, Materializer):
            return self.collects[Collector.materializers].add(node)

        if isinstance(node, Runtime):
            return self.collects[Collector.runtimes].add(node)

        print(node)
        print(isinstance(node, t.typedef))
        print(isinstance(node, t.func))
        raise Exception(f"Invalid node type {type(node).__name__}")


def build(root: Node) -> Collector:
    def visit(nodes: List[Any], collector: Collector):
        for node in nodes:
            collector.collect(node)
            visit(node.edges, collector)

    collector = Collector()
    visit([root], collector)

    return collector
