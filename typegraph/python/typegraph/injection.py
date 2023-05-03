# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Any, Dict, List, Literal, Optional, Tuple, Union
from attrs import field, frozen
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import NodeProxy
from typegraph.utils.attrs import always
from typegraph.graph.nodes import Node
from frozendict import frozendict


@frozen
class Injection:
    def data(self, _collector: Collector) -> Any:
        raise Exception("Must be overridden")


@frozen
class StaticInjection(Injection):
    value: str  # json serialized
    source: str = always("static")

    def data(self, _collector: Collector) -> Dict:
        return frozendict(
            {
                "source": "static",
                "data": self.value,
            }
        )


@frozen
class ContextInjection(Injection):
    name: str
    source: str = always("context")

    def data(self, _collector: Collector) -> Dict:
        return frozendict(
            {
                "source": "context",
                "data": self.name,
            }
        )


@frozen
class ParentInjection(Injection):
    tpe: NodeProxy
    source: str = always("parent")

    @property
    def edges(self) -> List[Node]:
        return [self.tpe]

    def data(self, collector: Collector) -> Dict:
        return frozendict(
            {
                "source": "parent",
                "data": collector.index(self.tpe),
            }
        )


@frozen
class SecretInjection(Injection):
    name: str
    source: str = always("secret")

    def data(self, _collector: Collector) -> Dict:
        return frozendict(
            {
                "source": "secret",
                "data": self.name,
            }
        )


InjectionEffect = Literal["create", "update", "upsert", "delete", "none"]


@frozen
class InjectionCase:
    effect: InjectionEffect
    injection: Injection

    def data(self, collector: Collector) -> frozendict:
        return frozendict(
            {"effect": self.effect, "injection": self.injection.data(collector)}
        )


@frozen
class InjectionSwitch:
    cases: Tuple[InjectionCase, ...] = field(factory=tuple)
    default: Optional[Injection] = field(default=None)

    @classmethod
    def from_dict(cls, d: Dict[Optional[InjectionEffect], Injection]):
        cases = tuple(
            InjectionCase(effect, injection)
            for effect, injection in d.items()
            if effect is not None
        )
        if len(cases) == len(d):
            return cls(cases)
        assert len(cases) == len(d) - 1, "Multiple None cases (impossible)"
        (def_cond, def_data) = list(d.items())[len(d) - 1]
        assert def_cond is None, "None case is not the latest in the injection"
        return cls(cases, def_data)

    def data(self, collector: Collector) -> Dict:
        return frozendict(
            {
                "cases": tuple(case.data(collector) for case in self.cases),
                "default": self.default.data(collector)
                if self.default is not None
                else None,
            }
        )

    def secrets(self) -> List[str]:
        res = [
            case.injection.name
            for case in self.cases
            if isinstance(case.injection, SecretInjection)
        ]
        if self.default is not None and isinstance(self.default, SecretInjection):
            res.append(self.default.name)
        return res


def static(data: Any) -> StaticInjection:
    import json

    return StaticInjection(json.dumps(data))


def context(name: str) -> ContextInjection:
    return ContextInjection(name)


def parent(tpe: Union[NodeProxy, str]) -> ParentInjection:
    if isinstance(tpe, str):
        from typegraph import t

        tpe = t.proxy(tpe)
    return ParentInjection(tpe)


def secret(name: str) -> SecretInjection:
    return SecretInjection(name)
