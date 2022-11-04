# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import field
import inspect
from pathlib import Path
from typing import Any
from typing import Callable
from typing import Dict
from typing import List
from typing import Literal
from typing import Optional
from typing import Tuple
from typing import TYPE_CHECKING
from typing import Union

from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.materializers.deno import DenoRuntime


if TYPE_CHECKING:
    from typegraph.types import types as t


typegraph_version = "0.0.1"


@dataclass(eq=True, frozen=True)
class Code:
    name: str
    source: str
    type: Literal["func", "module"] = field(default="func")


@dataclass
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


@dataclass
class Cors:
    allow_origin: List[str] = field(default_factory=list)
    allow_headers: List[str] = field(default_factory=list)
    expose_headers: List[str] = field(default_factory=list)
    allow_credentials: bool = True
    max_age: Optional[int] = None


@dataclass
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
        self.rate = [] if rate is None else rate
        self.cors = Cors() if cors is None else cors
        self.path = Path(inspect.stack()[1].filename)

    def next_type_id(self):
        self.latest_type_id += 1
        return self.latest_type_id

    # def register(self, type: "t.Type"):
    #     self.types.append(type)

    def __enter__(self):
        TypegraphContext.push(self)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        TypegraphContext.pop()

    def __call__(
        self, node: str, after_apply: Callable[["t.Type"], "t.Type"] = lambda x: x
    ) -> "NodeProxy":
        return NodeProxy(self, node, after_apply)

    def expose(self, **ops: Union["t.func", "t.struct"]):
        from typegraph.types import types as t
        from typegraph.logger import logger

        logger.debug(ops)

        for name, op in ops.items():
            logger.debug(f"name: {name}")
            logger.debug(f"op: {op}")
            if not isinstance(op, t.func):
                logger.debug(op)
                logger.debug(f"op: {op}")
                raise Exception(
                    f"cannot expose type {op.title} under {name}, requires a function, got a {op.type}"
                )

        self.exposed.update(ops)
        return self

    def root(self) -> "t.struct":
        from typegraph.types import types as t

        # TODO what if circular references?
        def assert_serial_materializers(tpe: t.typedef, serial: bool):
            if isinstance(tpe, NodeProxy):
                tpe = tpe.get()
            for e in tpe.edges:
                if not isinstance(e, t.typedef):
                    continue

                if isinstance(e, t.func):
                    if e.mat.serial != serial:
                        raise Exception(
                            f"expected materializer to be {'' if serial else 'non-'}serial"
                        )
                    assert_serial_materializers(e.out, serial)

                assert_serial_materializers(e, serial)

        # split into queries and mutations
        def split_operations(
            namespace: t.struct,
        ) -> Tuple[OperationTable, OperationTable]:
            queries: OperationTable = {}
            mutations: OperationTable = {}
            for name, op in namespace.props.items():
                if isinstance(op, t.struct):
                    q, m = split_operations(op)
                    q_name = f"{op.name}_q" if len(m) > 0 else op.name
                    m_name = f"{op.name}_m" if len(q) > 0 else op.name

                    if len(q) > 0:
                        queries[name] = t.struct(q).named(q_name)
                    if len(m) > 0:
                        mutations[name] = t.struct(m).named(m_name)

                elif isinstance(op, t.func):
                    serial = op.mat.serial
                    assert_serial_materializers(op.out, serial)
                    if not serial:
                        queries[name] = op
                    else:
                        mutations[name] = op

                else:
                    raise Exception(
                        f"expected operation or operation namespace, got type {op.type()}"
                    )

            return (queries, mutations)

        with self:
            queries, mutations = split_operations(t.struct(self.exposed))
            root = t.struct(
                {
                    "query": t.struct(queries),
                    "mutation": t.struct(mutations),
                }
            ).named(self.name)

        root._propagate_runtime(DenoRuntime())

        return root

    def build(self):
        def visit(nodes: List[Any], collector: Collector):
            for node in nodes:
                collector.collect(node)
                visit(node.edges, collector)

        collector = Collector()
        visit([self.root()], collector)

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
    def __init__(
        self,
        g: TypeGraph,
        node: str,
        after_apply: Callable[["t.Type"], "t.Type"],
    ):
        super().__init__(Collector.types)
        self.g = g
        self.node = node
        self.after_apply = after_apply

    def then(self, then_apply: Callable[["t.typedef"], "t.typedef"]):
        return NodeProxy(self.g, self.node, lambda n: then_apply(self.after_apply(n)))

    def get(self) -> "t.typedef":
        return self.g.type_by_names[self.node]

    @property
    def edges(self) -> List["Node"]:
        return self.get().edges

    def data(self, collector: "Collector") -> dict:
        return self.get().data(collector)
