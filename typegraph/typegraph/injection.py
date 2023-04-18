# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Any, Dict, List, Optional, Tuple, Union, TYPE_CHECKING
from attrs import field, frozen
from typegraph.effects import EffectType
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import NodeProxy
from typegraph.policies import Policy
from typegraph.utils.attrs import always

if TYPE_CHECKING:
    from typegraph import t


@frozen
class Injection:
    def data(self, _collector: Collector) -> Any:
        raise Exception("Must be overridden")


@frozen
class StaticInjection(Injection):
    value: str  # json serialized
    source: str = always("static")

    def data(self, _collector: Collector) -> Dict:
        return {
            "source": "static",
            "data": self.value,
        }


@frozen
class ContextInjection(Injection):
    name: str
    source: str = always("context")

    def data(self, _collector: Collector) -> Dict:
        return {
            "source": "context",
            "data": self.name,
        }


@frozen
class ParentInjection(Injection):
    tpe: "t.TypeNode"
    source: str = always("parent")

    def data(self, collector: Collector) -> Dict:
        return {
            "source": "parent",
            "data": collector.index(self.tpe),
        }


@frozen
class SecretInjection(Injection):
    name: str
    source: str = always("secret")

    def data(self, _collector: Collector) -> Dict:
        return {
            "source": "secret",
            "data": self.name,
        }


@frozen
class InjectionCase:
    when: Union[Policy, EffectType]
    what: Injection


@frozen
class InjectionSwitch:
    cases: Tuple[InjectionCase, ...] = field(factory=tuple)
    default: Optional[Injection] = field(default=None)

    def data(self, collector: Collector) -> Dict:
        return {
            "cases": (),
            "default": self.default.data(collector)
            if self.default is not None
            else None,
        }

    def secrets(self) -> List[str]:
        res = [
            case.what.name
            for case in self.cases
            if isinstance(case.what, SecretInjection)
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
