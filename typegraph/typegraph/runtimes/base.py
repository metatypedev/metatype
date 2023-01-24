# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from enum import auto
from typing import Dict
from typing import List
from typing import Optional
from typing import TYPE_CHECKING

from attrs import frozen
from strenum import LowercaseStrEnum
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.utils.attrs import always
from typegraph.utils.attrs import asdict


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


class Effect(LowercaseStrEnum):
    CREATE = auto()
    UPDATE = auto()
    DELETE = auto()
    UNKNOWN = auto()


@frozen
class Materializer(Node):
    runtime: Runtime
    effect: Optional[Effect] = always(None)  # to be set by child classes
    # see: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
    idempotent: bool = always(True)  # to be set by child classes
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
            "effect": data.pop("effect"),
            "idempotent": data.pop("idempotent"),
            "data": data,
        }
