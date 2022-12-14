# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from collections import defaultdict
from typing import DefaultDict
from typing import TYPE_CHECKING
from typing import Union

from ordered_set import OrderedSet
from typegraph.graphs.node import Node

if TYPE_CHECKING:
    from typegraph.graphs.typegraph import NodeProxy


class Collector:
    types = "types"
    runtimes = "runtimes"
    materializers = "materializers"
    policies = "policies"

    collects: DefaultDict[str, OrderedSet]
    frozen = False

    def __init__(self):
        self.collects = defaultdict(OrderedSet)

    def freeze(self):
        self.frozen = True

    def collect(self, node: Node) -> bool:
        """Add `node` to its target collect

        Returns:
            bool: `True` if the node was added to the collect,
                  `False` if it had already been added from previous operations
        """
        from typegraph.graphs.typegraph import NodeProxy

        if self.frozen:
            raise Exception("Frozen collector cannot collect")

        if isinstance(node, NodeProxy):
            node = node.get()

        c = node.collector_target
        if c is None:
            raise Exception("Attempting to collect non collectible node")

        collect = self.collects[c]
        prev_size = len(collect)
        collect.add(node)
        return len(collect) > prev_size

    # returns the index of the node in its collect
    def index(self, node: Union[Node, "NodeProxy"]):
        from typegraph.graphs.typegraph import NodeProxy

        if not isinstance(node, Node):
            raise Exception(f"expected Node, got {type(node).__name__}")

        if isinstance(node, NodeProxy):
            node = node.get()

        c = node.collector_target
        if c not in self.collects:
            raise Exception(f"Collector target '{c}' not found")

        return self.collects[c].index(node)
