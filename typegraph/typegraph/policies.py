# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List

from attrs import evolve
from attrs import field
from attrs import frozen
from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.deno import FunMat
from typegraph.utils.attrs import always


def policy_name_factory():
    tg = TypegraphContext.get_active()
    if tg is None:
        raise Exception("typegraph context needed")
    return f"policy_{tg.next_type_id()}"


@frozen
class Policy(Node):
    name: str = field(factory=policy_name_factory, kw_only=True)
    mat: Materializer
    collector_target: str = always(Collector.policies)

    def named(self, name: str):
        return evolve(self, name=name)

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


def allow_all(name: str = "__allow_all"):
    return Policy(FunMat("() => true")).named(name)
