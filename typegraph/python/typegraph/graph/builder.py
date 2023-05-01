# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict, Union

from ordered_set import OrderedSet

from typegraph.graph.nodes import Node, NodeProxy


class Collector:
    types = "types"
    runtimes = "runtimes"
    materializers = "materializers"
    policies = "policies"
    secrets = "secrets"

    collects: Dict[str, OrderedSet]
    frozen = False

    def __init__(self):
        self.collects = {
            f: OrderedSet()
            for f in [
                Collector.types,
                Collector.runtimes,
                Collector.materializers,
                Collector.policies,
                Collector.secrets,
            ]
        }

    def freeze(self):
        self.frozen = True

    def collect(self, node: Node) -> bool:
        # Add `node` to its target collect.
        # Returns:
        #    bool: `True` if the node was added to the collect,
        #          `False` if it had already been added from previous operations

        if self.frozen:
            raise Exception("Frozen collector cannot collect")

        if isinstance(node, NodeProxy):
            node = node.get()

        c = node.collector_target
        if c is None:
            return True

        collect = self.collects[c]
        prev_size = len(collect)

        collect.add(node)
        return len(collect) > prev_size

    # returns the index of the node in its collect
    def index(self, node: Union[Node, "NodeProxy"]):
        if not isinstance(node, Node):
            raise Exception(f"expected Node, got {type(node).__name__}")

        if isinstance(node, NodeProxy):
            node = node.get()

        c = node.collector_target
        if c not in self.collects:
            raise Exception(f"Collector target '{c}' not found")

        return self.collects[c].index(node)
