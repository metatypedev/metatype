# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict
from typing import List
from typing import Optional
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from typegraph.graphs.builder import Collector


class Node:
    collector_target: Optional[str]

    def __init__(self, collector_target: Optional[str] = None):
        self.collector_target = collector_target

    @property
    def edges(self) -> List["Node"]:
        return []

    def data(self, collector: "Collector") -> Dict:
        return {}
