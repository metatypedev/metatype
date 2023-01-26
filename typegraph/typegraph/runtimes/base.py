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


class EffectType(LowercaseStrEnum):
    CREATE = auto()
    UPDATE = auto()
    UPSERT = auto()
    DELETE = auto()
    UNKNOWN = auto()


@frozen
class Effect:
    effect: Optional[EffectType]
    # see: https://developer.mozilla.org/en-US/docs/Glossary/Idempotent
    idempotent: bool

    @classmethod
    def none(cls):
        return cls(None, True)

    @classmethod
    def create(cls, idempotent=False):
        return cls(EffectType.CREATE, idempotent)

    @classmethod
    def update(cls, idempotent=False):
        return cls(EffectType.UPDATE, idempotent)

    @classmethod
    def upsert(cls, idempotent=True):
        return cls(EffectType.UPSERT, idempotent)

    @classmethod
    def delete(cls, idempotent=True):
        return cls(EffectType.DELETE, idempotent)


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
            "effect": data.pop("effect"),
            "data": data,
        }
