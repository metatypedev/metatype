# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Any, Generic, List, Callable, Union, TypeVar, Dict, Type, Optional
from attrs import field, frozen
from typegraph.effects import EffectType
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import NodeProxy
from typegraph.utils.attrs import always
from typegraph.graph.nodes import Node
from frozendict import frozendict


T = TypeVar("T")


@frozen
class SingleValue(Generic[T]):
    value: T


@frozen
class ValueByEffect(Generic[T]):
    switch: Dict[str, T] = field(converter=frozendict)


InjectionData = Union[SingleValue[T], ValueByEffect[T]]

InjectionDataInit = Union[T, Dict[EffectType, T]]


def init_injection_data(
    init: InjectionDataInit[T],
    value_class: Optional[Type] = None,
    mapper: Callable[[T], Any] = lambda x: x,
) -> InjectionData[T]:
    if (
        isinstance(init, dict)
        and len(init) > 0
        and all(isinstance(k, EffectType) for k in init.keys())
    ):
        values = {str(k): mapper(v) for k, v in init.items()}
        if value_class is not None:
            assert all(isinstance(v, value_class) for v in values.values())
        return ValueByEffect(values)

    value = mapper(init)
    if value_class is not None:
        assert isinstance(value, value_class)
    return SingleValue(value)


def serialize_injection_data(
    data: InjectionData[T], mapper: Callable[[T], Any]
) -> frozendict:
    if isinstance(data, SingleValue):
        return frozendict(value=mapper(data.value))
    return frozendict(
        {str(effect): mapper(value) for effect, value in data.switch.items()}
    )


@frozen
class Injection:
    def data(self, _collector: Collector) -> Any:
        raise Exception("Must be overridden")


@frozen
class StaticInjection(Injection):
    value: InjectionData[str]  # json serialized data
    source: str = always("static")

    def data(self, _collector: Collector) -> frozendict:
        return frozendict(
            {
                "source": "static",
                # json serialized data
                "data": serialize_injection_data(self.value, lambda x: x),
            }
        )


GENERATORS = [
    "now",
    # "uuid"
]


def ensure_valid_generator(name: str):
    if name not in GENERATORS:
        raise Exception(f"Invalid generator name: {name}")
    return name


@frozen
class DynamicValueInjection(Injection):
    value: InjectionData[str]  # generator name
    source: str = always("dynamic")

    def data(self, _collector: Collector) -> frozendict:
        return frozendict(
            {
                "source": "dynamic",
                "data": serialize_injection_data(self.value, ensure_valid_generator),
            }
        )


@frozen
class ContextInjection(Injection):
    value: InjectionData[str]  # context name
    source: str = always("context")

    def data(self, _collector: Collector) -> frozendict:
        return frozendict(
            {
                "source": "context",
                "data": serialize_injection_data(self.value, lambda x: x),
            }
        )


@frozen
class ParentInjection(Injection):
    value: InjectionData[NodeProxy]  # parent type
    source: str = always("parent")

    @property
    def edges(self) -> List[Node]:
        if isinstance(self.value, SingleValue):
            return [self.value.value]
        return list(self.value.switch.values())

    def data(self, collector: Collector) -> frozendict:
        return frozendict(
            {
                "source": "parent",
                "data": serialize_injection_data(
                    self.value, lambda tpe: collector.index(tpe)
                ),
            }
        )


@frozen
class SecretInjection(Injection):
    value: InjectionData[str]  # secret name
    source: str = always("secret")

    def data(self, _collector: Collector) -> frozendict:
        return frozendict(
            {
                "source": "secret",
                "data": serialize_injection_data(self.value, lambda x: x),
            }
        )
