# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import TYPE_CHECKING, Callable, Dict, List, Optional

from attrs import define, field

if TYPE_CHECKING:
    from typegraph import types as t
    from typegraph.graph.builder import Collector
    from typegraph.graph.typegraph import TypeGraph


@define(kw_only=True, eq=False)
class Node:
    collector_target: Optional[str] = field(init=False, default=None)

    @property
    def edges(self) -> List["Node"]:
        return []

    def data(self, collector: "Collector") -> Dict:
        return {}


@define(eq=False)
class NodeProxy(Node):
    graph: "TypeGraph"
    node: str
    after_apply: Optional[Callable[["t.typedef"], "t.typedef"]] = None

    def then(self, then_apply: Callable[["t.typedef"], "t.typedef"]):
        return NodeProxy(
            self.graph, self.node, lambda n: then_apply(self.after_apply(n))
        )

    def get(self) -> "t.typedef":
        tpe = self.graph.type_by_names.get(self.node)
        if tpe is None:
            raise Exception(f"No registered type named '{self.node}'")
        if self.after_apply is None:
            return tpe
        tpe = self.after_apply(tpe)
        self.graph.type_by_names[tpe.name] = tpe
        self.node = tpe.name
        self.after_apply = None
        return tpe

    @property
    def edges(self) -> List["Node"]:
        return self.get().edges

    def data(self, collector: "Collector") -> dict:
        return self.get().data(collector)

    @property
    def name(self) -> str:
        return self.node

    def optional(self):
        from typegraph import types as t

        return t.optional(self)
