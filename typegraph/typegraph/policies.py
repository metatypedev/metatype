# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List
from typing import Optional
from typing import TYPE_CHECKING
from typing import Union

from attrs import evolve
from attrs import field
from attrs import frozen
from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import ImportFunMat
from typegraph.utils.attrs import always


if TYPE_CHECKING:
    from typegraph.types import types as t


def policy_name_factory():
    tg = TypegraphContext.get_active()
    if tg is None:
        raise Exception("typegraph context needed")
    return f"policy_{tg.next_type_id()}"


PolicyType = Union["Policy", "SpecialPolicy"]


@frozen
class PolicyBase(Node):
    name: str = field(factory=policy_name_factory, kw_only=True)
    collector_target: str = always(Collector.policies)

    def named(self, name: str):
        return evolve(self, name=name)

    def data(self, collector):
        raise Exception("cannot collect PolicyBase")


@frozen
class Policy(PolicyBase):
    mat: Materializer

    @property
    def edges(self) -> List[Node]:
        return [self.mat]

    def data(self, collector):
        return {
            "name": self.name,
            "materializer": collector.index(self.mat),
        }

    @classmethod
    def get_from(cls, p) -> "Policy":
        if isinstance(p, Materializer):
            return cls(p)
        if isinstance(p, cls):
            return p
        raise Exception(f"Cannot create Policy from a {type(p).__name__}")


@frozen
class SpecialPolicy(PolicyBase):
    func: "t.func"

    def __attrs_post_init__(self):
        self.func._propagate_runtime(self.func.runtime)

    @property
    def edges(self) -> List[Node]:
        return [self.func]

    def data(self, collector):
        return {"name": self.name, "function": collector.index(self.func)}


@frozen
class SpecialPolicyBuilder:
    mat: Materializer
    name: Optional[str] = field(default=None)

    def build(self, inp: "t.struct") -> SpecialPolicy:
        from typegraph.types import types as t

        pol = SpecialPolicy(t.func(inp, t.boolean(), self.mat))
        if self.name is not None:
            pol = pol.named(self.name)
        elif isinstance(self.mat, ImportFunMat):
            pol = pol.named(f"{self.mat.mod.file}::{self.mat.name}")

        return pol


def special(mat: Materializer):
    return SpecialPolicyBuilder(mat)


def allow_all(name: str = "__allow_all"):
    return Policy(FunMat("() => true")).named(name)
