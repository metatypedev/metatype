# Copyright Metatype under the Elastic License 2.0.

from copy import deepcopy
from types import NoneType
from typing import Any
from typing import Dict
from typing import get_args
from typing import get_origin
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple
from typing import Type
from typing import Union

from frozendict import frozendict
import orjson
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypeGraph
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Runtime


def replace(obj, **kwargs):
    # handle errors
    fields = {k: deepcopy(v) for k, v in vars(obj).items() if k not in kwargs}
    fields.update(**kwargs)
    return type(obj)(**fields)


def is_optional(tpe: Type):
    # Optional = Union[T, NoneType]
    return get_origin(tpe) is Union and NoneType in get_args(tpe)


class typedef:
    graph: TypeGraph
    name: str
    description: Optional[str]
    runtime: Optional["Runtime"]
    inject: Optional[Union[str, "typedef"]]
    injection: Optional[Any]
    policies: Tuple["policy"]

    def __init__(
        self,
        graph: Optional[TypeGraph] = None,
        runtime: Optional["Runtime"] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        inject: Optional[Union[str, "typedef"]] = None,
        injection: Optional[Any] = None,
        policies: Optional[Tuple["policy"]] = None,
        **kwargs,
    ) -> "typedef":

        for k, v in type(self).__annotations__.items():
            # manage dataclass like behaviour (e.g. field) and block bad instanciation (e.g. [])
            if is_optional(v):
                setattr(self, k, kwargs.pop(k, getattr(self, k)))

        if graph is None:
            self.graph = TypegraphContext.get_active()
            if self.graph is None:
                raise Exception("no typegraph context")
            self.graph.register(self)
        else:
            self.graph = graph

        # TODO ensure subclass type
        self.name = f"{self.type}{self.graph.next_type_id()}" if name is None else name
        self.description = description
        self.runtime = runtime
        self.inject = inject
        self.injection = None if self.inject is None else injection
        self.policies = tuple() if policies is None else policies

    @property
    def type(self):
        return type(self).__name__

    def named(self, name: str) -> "typedef":
        # TODO: ensure name is not already used in typegraph
        return type(self)(**self, name=name)

    def describe(self, description: str) -> "typedef":
        return type(self)(**self, description=description)

    def within(self, runtime):
        if runtime is None:
            raise Exception(f"cannot set runtime to None")

        if self.runtime is not None and self._runtime != runtime:
            raise Exception(
                f"trying to set a different runtime {runtime}, already is {self.runtime}"
            )

        self.runtime = runtime

    def _propagate_runtime(self, runtime: "Runtime", visited: Set["typedef"] = None):
        if visited is None:
            visited = set()
        elif self in visited:
            return
        else:
            visited.add(self)

        if self.runtime is None:
            self.runtime = runtime

        for e in self.edges:
            e._propagate_runtime(self.runtime, visited)

    def set(self, value):
        if self.inject is not None:
            raise Exception(f"{self.node} can only have one injection")

        return type(self)(**self, injection="raw", inject=orjson.dumps(value).decode())

    def from_secret(self, secret_name):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return type(self)(**self, injection="secret", inject=secret_name)

    def from_parent(self, sibiling: "NodeProxy"):
        # TODO: check for same type and value in same context
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return type(self)(**self, injection="parent", inject=sibiling)

    def from_context(self, claim: str):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return type(self)(**self, injection="context", inject=claim)

    def add_policy(
        self,
        *policies: List["policy"],
    ):
        return self.__init__(**self, policies=self.policies + policies)

    def data(self, collector) -> dict:
        ret = {"name": self.name, "schema": collector.collect("schema", self.schema)}
        if self.default_value is not None:
            ret["default_value"] = self.default_value
        if self.inject is not None:
            ret["inject"] = self.inject
            ret["injection"] = self.injection
        return ret

    def optional(self, default_value: Optional[Any] = None):
        if isinstance(self, optional):
            return self

        with self.graph:
            return optional(self, default_value=default_value)

    def __repr__(self) -> str:
        def pretty(v):
            if isinstance(v, frozendict):
                return dict(v)
            return v

        attrs = ", ".join(
            f"{k} → {pretty(v)}"
            for k, v in vars(self).items()
            if k not in ("graph",) and v is not None
        )
        return f"{self.type}({attrs})"


class optional(typedef):
    of: typedef
    default_value: Optional[Any] = None

    def __init__(self, of: typedef, **kwargs) -> "optional":
        super().__init__(**kwargs)
        self.of = of

    def default(self, value):
        if self.default_value is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.__init__(**self, default_value=value)

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "default_value": self.default_value,
        }


class string(typedef):
    _min: Optional[int] = None
    _max: Optional[int] = None

    def __init__(self, **kwargs) -> "string":
        self._min = min
        super().__init__(**kwargs)

    def min(self, n: int) -> "string":
        return replace(self, _min=n)

    def max(self, n: int) -> "string":
        return replace(self, _max=n)


class policy(typedef):
    pass


class Collector:
    collects: Dict[str, List[Any]]

    def __init__(self) -> "Collector":
        self.collects = dict()

    def collect(self, name: str, value: Any) -> int:
        if name not in self.collects:
            self.collects[name] = list()

        collect = self.collects[name]

        for i in range(len(collect)):
            if collect[i] == value:
                return i

        collect.append(value)
        return i + 1


with TypeGraph(
    "new",
) as g:
    print(string().min(3).max(4).optional())
