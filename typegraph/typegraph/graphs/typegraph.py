# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import inspect
from pathlib import Path
from typing import Callable
from typing import Dict
from typing import List
from typing import Literal
from typing import Optional
from typing import Set
from typing import TYPE_CHECKING
from typing import Union

from attrs import define
from attrs import field
from attrs import frozen
from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.materializers.deno import DenoRuntime


if TYPE_CHECKING:
    from typegraph.types import types as t


typegraph_version = "0.0.1"


@frozen
class Code:
    name: str
    source: str
    type: Literal["func", "module"] = field(default="func")


@define
class Auth:
    name: str
    protocol: str
    auth_data: Dict[str, str]

    @classmethod
    def oauth2(
        cls,
        name: str,
        authorize_url: str,
        access_url: str,
        scopes: str,
        profile_url: Optional[str] = None,
    ) -> "Auth":
        return Auth(
            name,
            "oauth2",
            dict(
                authorize_url=authorize_url,
                access_url=access_url,
                scopes=scopes,
                profile_url=profile_url,
            ),
        )

    # deno eval 'await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-384"}, true, ["sign", "verify"]).then(k => crypto.subtle.exportKey("jwk", k.publicKey)).then(JSON.stringify).then(console.log);'
    @classmethod
    def jwk(cls, name: str, args=None) -> "Auth":
        return Auth(name, "jwk", args if args is not None else {})

    @classmethod
    def basic(cls, users: List[str]) -> "Auth":
        return Auth("basic", "basic", {"users": users})


github_auth = Auth.oauth2(
    "github",
    "https://github.com/login/oauth/authorize",
    "https://github.com/login/oauth/access_token",
    "openid profile email",
    "https://api.github.com/user",
)


@define
class Cors:
    allow_origin: List[str] = field(factory=list)
    allow_headers: List[str] = field(factory=list)
    expose_headers: List[str] = field(factory=list)
    allow_credentials: bool = True
    max_age: Optional[int] = None


@define
class Rate:
    window_limit: int
    window_sec: int
    query_limit: int
    context_identifier: Optional[str] = None
    local_excess: int = 0


OperationTable = Dict[str, Union["t.func", "t.struct"]]


class TypeGraph:
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
        from typegraph.types import types as t

        # allow to expose only functions or structures (namespaces)
        for name, op in ops.items():
            if isinstance(op, t.func) or isinstance(op, t.struct):
                continue

            raise Exception(
                f"cannot expose type {op.title} under {name}, requires a function or structure (namespace), got a {op.type}"
            )

        self.exposed.update(ops)
        return self

    def root(self) -> "t.struct":
        from typegraph.types import types as t

        def assert_non_serial_materializers(
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
                    if e.mat.serial:
                        raise Exception(
                            f"expected materializer to be non-serial ({e.mat})"
                        )
                    assert_non_serial_materializers(e.out)

                else:
                    assert_non_serial_materializers(e)

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
    def get_active(cls) -> TypeGraph:
        try:
            return cls.typegraphs[-1]
        except IndexError:
            return None


def get_absolute_path(relative: str) -> Path:
    tg_path = TypegraphContext.get_active().path
    return tg_path.parent / relative


class NodeProxy(Node):
    g: TypeGraph
    node: str
    after_apply: Optional[Callable[["t.typedef"], "t.typedef"]]

    def __init__(
        self,
        g: TypeGraph,
        node: str,
        after_apply: Optional[Callable[["t.typedef"], "t.typedef"]] = None,
    ):
        super().__init__()
        self.g = g
        self.node = node
        self.after_apply = after_apply

    def then(self, then_apply: Callable[["t.typedef"], "t.typedef"]):
        return NodeProxy(self.g, self.node, lambda n: then_apply(self.after_apply(n)))

    def get(self) -> "t.typedef":
        tpe = self.g.type_by_names.get(self.node)
        if tpe is None:
            raise Exception(f"No registered type named '{self.node}'")
        if self.after_apply is None:
            return tpe
        tpe = self.after_apply(tpe)
        self.g.type_by_names[tpe.name] = tpe
        self.node, self.after_apply = tpe.name, None
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
        from typegraph.types import types as t

        return t.optional(self)


def find(node: str) -> Optional[NodeProxy]:
    g = TypegraphContext.get_active()
    if g is None:
        raise Exception("No active TypegraphContext")
    if node in g.type_by_names:
        return g(node)
    else:
        return None


def resolve_proxy(tpe: Union[NodeProxy, "t.typedef"]) -> "t.typedef":
    from typegraph.types import types as t

    if isinstance(tpe, NodeProxy):
        return tpe.get()
    else:
        assert isinstance(tpe, t.typedef)
        return tpe
