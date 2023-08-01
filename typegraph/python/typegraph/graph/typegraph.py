# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import inspect
import json
import os
from pathlib import Path
from typing import TYPE_CHECKING, Callable, Dict, List, Optional, Set, Union

import attrs
from frozendict import frozendict

from typegraph.graph.builder import Collector
from typegraph.graph.models import Auth, Cors, Rate
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.effects import EffectType

if TYPE_CHECKING:
    from typegraph import types as t
    from typegraph.policies import Policy


OperationTable = Dict[str, Union["t.func", "t.struct"]]

typegraph_version = "0.0.2"


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if attrs.has(o):
            return attrs.asdict(o)
        if isinstance(o, frozendict):
            return dict(o)
        if isinstance(o, EffectType):
            return str(o)
        return super().default(o)


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
        if (
            os.environ.get("PY_TG_COMPATIBILITY") is not None
            and TypegraphContext.is_empty()
            and not TypegraphContext.no_build
        ):
            tg = self.build()
            output = json.dumps(tg, cls=JSONEncoder)
            print(output)

    def __call__(
        self, node: str, after_apply: Callable[["t.typedef"], "t.typdef"] = lambda x: x
    ) -> "NodeProxy":
        return NodeProxy(self, node, after_apply)

    def expose(
        self,
        default_policy: Optional[Union["Policy", List["Policy"]]] = None,
        **ops: Union["t.func", "t.struct"],
    ):
        from typegraph import types as t

        default_policies = default_policy or []
        if not isinstance(default_policies, list):
            default_policies = [default_policies]

        # allow to expose only functions or structures (namespaces)
        for name, op in ops.items():
            if not isinstance(op, t.func) and not isinstance(op, t.struct):
                raise Exception(
                    f"cannot expose type {op.title} under {name}, requires a function"
                    f" or structure (namespace), got a {op.type}"
                )

            if name in self.exposed:
                raise Exception(f"operation {name} already exposed")

            self.exposed[name] = op.add_policy(*default_policies)

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

        TypegraphContext.no_build = True
        with self:
            # allow all characters for the root entry-point
            root = t.struct(self.exposed).named(self.name, validate=False)

        TypegraphContext.no_build = False

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
            "queries": {  # only in new SDK
                "dynamic": True,
                "endpoints": [],
            },
            "auths": self.auths,
            "rate": self.rate,
            "cors": self.cors,
            "version": typegraph_version,
        }

        ret["$id"] = f"https://metatype.dev/specs/{typegraph_version}.json"

        return ret


class TypegraphContext:
    typegraphs: List[TypeGraph] = []
    no_build = False

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
    def is_empty(cls) -> bool:
        return len(cls.typegraphs) == 0

    @classmethod
    def get_active(cls) -> Optional[TypeGraph]:
        try:
            return cls.typegraphs[-1]
        except IndexError:
            return None


def get_absolute_path(relative: str, stack_depth: int = 1) -> Path:
    """
    Concat stack_depth-th immediate caller path with `relative`.
    By default, `stack_depth` is set to 1, this ensure that the file
    holding the definition of this function is not considered.
    """
    path = Path(inspect.stack()[stack_depth].filename)
    ret = path.parent.absolute().joinpath(relative)
    if os.path.exists(ret):
        return ret
    raise Exception(f'path "{ret}" infered from "{path}" does not exist')


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
