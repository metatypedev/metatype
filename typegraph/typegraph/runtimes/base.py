# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import TYPE_CHECKING, Dict, List, Optional

from attrs import frozen

from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.utils.attrs import always, asdict

if TYPE_CHECKING:
    from typegraph import types as t


@frozen
class Runtime(Node):
    runtime_name: str
    collector_target: Optional[str] = always(Collector.runtimes)

    def data(self, collector: Collector) -> Dict:
        data = asdict(self)
        data.pop("collector_target")
        return {"name": data.pop("runtime_name"), "data": data}

    def get_type_config(self, type: "t.typedef") -> Dict:
        return dict()


@frozen
class Materializer(Node):
    runtime: Runtime
    effect: Effect
    collector_target: Optional[str] = always(Collector.materializers)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.runtime]

    def data(self, collector: Collector) -> dict:
        data = asdict(self)
        data.pop("collector_target")
        return {
            "name": data.pop("materializer_name"),
            "runtime": collector.index(data.pop("runtime")),
            "effect": asdict(data.pop("effect")),
            "data": data,
        }
