# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import KW_ONLY
from typing import List

from typegraph.graphs.node import Collector
from typegraph.graphs.node import Node


@dataclass(frozen=True, eq=True)
class Runtime(Node):
    runtime_name: str
    _: KW_ONLY
    collector_target: str = Collector.runtimes


@dataclass(eq=True, frozen=True)
class Materializer(Node):
    runtime: Runtime
    _: KW_ONLY
    serial: bool = False
    collector_target: str = Collector.materializers

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.runtime]
