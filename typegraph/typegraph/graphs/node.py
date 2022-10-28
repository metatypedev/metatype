# Copyright Metatype under the Elastic License 2.0.

from typing import List
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from typegraph.graphs.builder import Collector


class Node:
    collector_target: str

    def __init__(self, collector_target: str):
        self.collector_target = collector_target

    @property
    def edges(self) -> List["Node"]:
        return []

    def data(self, collector: "Collector") -> dict:
        return {}
