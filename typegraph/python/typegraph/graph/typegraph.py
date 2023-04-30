# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
from pathlib import Path
from typing import TYPE_CHECKING, Callable, Dict, List, Optional, Set, Union

from typegraph.graph.builder import Collector
from typegraph.graph.models import Auth, Cors, Rate
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.runtimes.deno import DenoRuntime

if TYPE_CHECKING:
    from typegraph import types as t


OperationTable = Dict[str, Union["t.func", "t.struct"]]

typegraph_version = "0.0.1"


class TypeGraph:
    Auth = Auth
    Cors = Cors
    Rate = Rate

    # repesent domain projected to an interface
    name: str
    # version should be commit based
    # types: List["t.typedef"]
    type_by_names: Dict[str, "t.typedef"]  # for explicit names
    exposed: OperationTable
    latest_type_id: int
    auths: List[Auth]
    rate: Optional[Rate]
    cors: Cors
    path: str

    def __init__(
        self,
        name: str,
        auths=None,
        rate=None,
        cors=None,
    ) -> None:
        super().__init__()
        self.name = name
        # self.types = []
        self.type_by_names = {}
        self.exposed = {}
        self.policies = []
        self.latest_type_id = 0
        self.auths = [] if auths is None else auths
        self.rate = rate
        self.cors = Cors() if cors is None else cors
        self.path = Path(inspect.stack()[1].filename)

    def next_type_id(self):
        self.latest_type_id += 1
        return self.latest_type_id

    def __enter__(self):
        TypegraphContext.push(self)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        TypegraphContext.pop()

    def __call__(
        self, node: str, after_apply: Callable[["t.typedef"], "t.typdef"] = lambda x: x
    ) -> "NodeProxy":
        return NodeProxy(self, node, after_apply)

    def expose(self, **ops: Union["t.func", "t.struct"]):
        from typegraph import types as t

        default_policy = ops.pop("default_policy", [])
        if not isinstance(default_policy, list):
            default_policy = [default_policy]

        # allow to expose only functions or structures (namespaces)
        for name, op in ops.items():
            if not isinstance(op, t.func) and not isinstance(op, t.struct):
                raise Exception(
                    f"cannot expose type {op.title} under {name}, requires a function or structure (namespace), got a {op.type}"
                )

            if name in self.exposed:
                raise Exception(f"operation {name} already exposed")

            self.exposed[name] = op.add_policy(*default_policy)

        return self

    def root(self) -> "t.struct":
        from typegraph import types as t

        def assert_no_effect_materializers(
            tpe: Union[t.typedef, NodeProxy], history: Set[t.typedef] = set()
        ):
            if isinstance(tpe, NodeProxy):
                tpe = tpe.get()

            if tpe in history:
                return

            for e in tpe.edges:
                if not isinstance(e, t.typedef):
                    continue

                if isinstance(e, t.func):
                    if e.mat.effect.effect is not None:
                        raise Exception(
                            f"expected materializer to have no effect: ({e.mat})"
                        )
                    assert_no_effect_materializers(e.out)

                else:
                    assert_no_effect_materializers(e)

        with self:
            root = t.struct(self.exposed).named(self.name)

        root._propagate_runtime(DenoRuntime())

        return root

    def collect_nodes(self) -> Collector:
        def visit(nodes: List[Node], collector: Collector):
            for node in nodes:
                if collector.collect(node):
                    visit(node.edges, collector)

        collector = Collector()
        visit([self.root()], collector)

        return collector

    def build(self):
        if self.name.startswith("__"):
            raise Exception(f"cannot build typegraph with reserved name '{self.name}'")

        collector = self.collect_nodes()

        ret = {
            c: [n.data(collector) for n in collector.collects[c]]
            for c in collector.collects
        }

        ret["meta"] = {
            "secrets": ret.pop("secrets") if "secrets" in ret else [],
            "auths": self.auths,
            "rate": self.rate,
            "cors": self.cors,
            "version": typegraph_version,
        }

        ret["$id"] = f"https://metatype.dev/specs/{typegraph_version}.json"

        return ret


class TypegraphContext:
    typegraphs: List[TypeGraph] = []

    @classmethod
    def push(cls, tg: TypeGraph):
        cls.typegraphs.append(tg)

    @classmethod
    def pop(cls) -> Optional[TypeGraph]:
        try:
            return cls.typegraphs.pop()
        except IndexError:
            return None

    @classmethod
    def get_active(cls) -> Optional[TypeGraph]:
        try:
            return cls.typegraphs[-1]
        except IndexError:
            return None


def get_absolute_path(relative: str) -> Path:
    tg_path = TypegraphContext.get_active().path
    return tg_path.parent / relative


def find(node: str) -> Optional["t.typedef"]:
    g = TypegraphContext.get_active()
    if g is None:
        raise Exception("No active TypegraphContext")
    if node in g.type_by_names:
        return g.type_by_names[node]
    else:
        return None


def resolve_proxy(tpe: Union[NodeProxy, "t.typedef"]) -> "t.typedef":
    from typegraph import types as t

    if isinstance(tpe, NodeProxy):
        return tpe.get()
    else:
        assert isinstance(tpe, t.typedef)
        return tpe
