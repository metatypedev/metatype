# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict
from typing import List
from typing import Optional
from typing import TYPE_CHECKING

from attrs import frozen
from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.utils.attrs import always
from typegraph.utils.attrs import asdict


if TYPE_CHECKING:
    from typegraph.types import types as t


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
    serial: bool = always(False)  # to be set by child classes
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
            "data": data,
        }
