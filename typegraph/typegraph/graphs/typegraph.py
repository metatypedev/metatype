from dataclasses import dataclass
from dataclasses import field
import os
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


class TypeGraph:
    # repesent domain projected to an interface
    name: str
    # version should be commit based
    types: List["t.Type"]
    exposed: Dict[str, "t.func"]
    latest_type_id: int
    codes: List[Code]

    def __init__(self, name: str) -> None:
        super().__init__()
        self.name = name
        self.types = []
        self.exposed = {}
        self.policies = []
        self.latest_type_id = 0
        self.codes = []

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

    def fun(self, source: str, name: Optional[str] = None):
        if name is None:
            name = f"fn_{len(self.codes) + 1}_"
        self.codes.append(Code(name, source))
        return name

    def module(
        self,
        source: Optional[str] = None,
        load: Optional[str] = None,
        name: Optional[str] = None,
    ):
        if name is None:
            name = f"module_{len(self.codes) + 1}_"
        if source is None:
            if load is None:
                raise Exception("source or file must be specified")
            if os.environ["DONT_READ_EXTERNAL_TS_FILES"]:
                source = f"file:{load}"
            else:
                with open(load) as f:
                    source = f.read()
        self.codes.append(Code(name, source, type="module"))
        return name

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
