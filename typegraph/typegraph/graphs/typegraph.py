# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import field
import inspect
from pathlib import Path
from typing import Callable
from typing import Dict
from typing import List
from typing import Literal
from typing import Optional
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from typegraph.types import typedefs as t


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
    def github(cls) -> "Auth":
        return

    @classmethod
    def oauth2(
        cls,
        name: str,
        authorize_url: str,
        access_url: str,
        scopes: str,
        profile_url: Optional[str],
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


class TypeGraph:
    # repesent domain projected to an interface
    name: str
    # version should be commit based
    types: List["t.Type"]
    exposed: Dict[str, "t.func"]
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
        self.types = []
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

    def register(self, type: "t.Type"):
        self.types.append(type)

    def __enter__(self):
        TypegraphContext.push(self)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        TypegraphContext.pop()

    def __call__(
        self, node: str, after_apply: Callable[["t.Type"], "t.Type"] = lambda x: x
    ) -> "NodeProxy":
        return NodeProxy(self, node, after_apply)

    def expose(self, **funcs: Dict[str, "t.func"]):
        from typegraph.types import typedefs as t

        for name, func in funcs.items():
            if not isinstance(func, t.func):
                raise Exception(
                    f"cannot expose type={func.node} under {name}, requires a func"
                )

        self.exposed.update(funcs)
        return self

    def build(self):
        from typegraph.graphs import builders

        return builders.build(self)


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


class NodeProxy:
    def __init__(
        self,
        g: TypeGraph,
        node: str,
        after_apply: Callable[["t.Type"], "t.Type"],
    ):
        super().__init__()
        self.g = g
        self.node = node
        self.after_apply = after_apply
        self.tpe = None

    def then(self, then_apply: Callable[["t.Type"], "t.Type"]):
        return NodeProxy(self.g, self.node, lambda n: then_apply(self.after_apply(n)))

    def get(self):
        if self.tpe is None:
            lookup = next((tpe for tpe in self.g.types if tpe.node == self.node), None)
            if lookup is None:
                raise Exception(f'unknown proxy type declared "{self.node}"')

            self.tpe = self.after_apply(lookup)
        return self.tpe

    def __getattr__(self, attr):
        return getattr(self.get(), attr)
