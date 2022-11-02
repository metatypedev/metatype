# Copyright Metatype under the Elastic License 2.0.
from copy import deepcopy
import os
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
from typegraph.graphs.builder import Collector
from typegraph.graphs.node import Node
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypeGraph
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.policies import Policy


if os.environ.get("DEBUG"):
    import debugpy

    debugpy.listen(5678)
    print("Waiting for debugger attach...")
    debugpy.wait_for_client()


def replace(obj, **kwargs):
    # handle errors
    fields = {k: deepcopy(v) for k, v in vars(obj).items() if k not in kwargs}
    fields.update(**kwargs)
    return type(obj)(**fields)


def remove_none_values(obj):
    return {k: v for k, v in obj.items() if v is not None}


def is_optional(tpe: Type):
    # Optional = Union[T, NoneType]
    return get_origin(tpe) is Union and NoneType in get_args(tpe)


class Secret(Node):
    secret: str

    def __init__(self, secret: str):
        super().__init__("secrets")
        self.secret = secret

    def data(self, collector: "Collector") -> dict:
        return self.secret  # this is a string


class typedef(Node):
    graph: TypeGraph
    name: str
    description: Optional[str]
    runtime: Optional["Runtime"]
    inject: Optional[Union[str, "typedef"]]
    injection: Optional[Any]
    policies: Tuple[Policy, ...]

    def __init__(
        self,
        graph: Optional[TypeGraph] = None,
        runtime: Optional["Runtime"] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        inject: Optional[Union[str, "typedef"]] = None,
        injection: Optional[Any] = None,
        policies: Optional[Tuple[Policy, ...]] = None,
        **kwargs,
    ):
        super().__init__(
            kwargs["collector_target"]
            if "collector_target" in kwargs
            else Collector.types
        )

        for k, v in type(self).__annotations__.items():
            # manage dataclass like behaviour (e.g. field) and block bad instanciation (e.g. [])
            if is_optional(v):
                setattr(self, k, kwargs.pop(k, getattr(self, k)))

        if graph is None:
            active_graph = TypegraphContext.get_active()
            if active_graph is None:
                raise Exception("no typegraph context")
            self.graph = active_graph
            self.graph.register(self)  # FIXME still needed?
        else:
            self.graph = graph

        # TODO ensure subclass type
        self.name = f"{self.type}_{self.graph.next_type_id()}" if name is None else name
        self.description = description
        self.runtime = runtime
        self.inject = inject
        self.injection = None if self.inject is None else injection
        self.policies = tuple() if policies is None else policies

    @property
    def type(self):
        return type(self).__name__

    @property
    def edges(self) -> List[Node]:
        secret = self.inject if self.injection == "secret" else None
        return (
            super().edges
            + list(self.policies)
            + list(filter(None, [self.runtime, secret]))
        )

    def named(self, name: str) -> "typedef":
        # TODO: ensure name is not already used in typegraph
        return replace(self, name=name)

    def describe(self, description: str) -> "typedef":
        return replace(self, description=description)

    def within(self, runtime):
        if runtime is None:
            raise Exception(f"cannot set runtime to None")

        if self.runtime is not None and self._runtime != runtime:
            raise Exception(
                f"trying to set a different runtime {runtime}, already is {self.runtime}"
            )

        self.runtime = runtime

        return self

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
            if isinstance(e, typedef):
                e._propagate_runtime(self.runtime, visited)

    def set(self, value):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return replace(self, injection="raw", inject=orjson.dumps(value).decode())

    def from_secret(self, secret_name):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return replace(self, injection="secret", inject=Secret(secret_name))

    def from_parent(self, sibiling: "NodeProxy"):
        # TODO: check for same type and value in same context
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return replace(self, injection="parent", inject=sibiling)

    def from_context(self, claim: str):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return replace(self, injection="context", inject=claim)

    def add_policy(
        self,
        *policies: List["Policy"],
    ):
        return replace(self, policies=self.policies + policies)

    def data(self, collector) -> dict:
        ret = {
            "type": self.type,
            "title": self.name,
            "runtime": collector.collect(self.runtime),
            "policies": [collector.collect(p) for p in self.policies],
        }
        if self.description is not None:
            ret["description"] = self.description

        if self.inject is not None:
            ret["injection"] = self.injection
            if self.injection == "parent":
                ret["inject"] = collector.collect(self.inject)
            elif self.injection == "secret":
                ret["inject"] = self.inject.secret
            else:
                ret["inject"] = self.inject

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

    def __init__(self, of: typedef, **kwargs):
        super().__init__(**kwargs)
        self.of = of

    def default(self, value):
        if self.default_value is not None:
            raise Exception(f"{self.name} can only have one injection")

        return replace(self, default_value=value)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "item": collector.collect(self.of),
            "default_value": self.default_value,
        }


class boolean(typedef):
    pass


class number(typedef):
    _min: Optional[float] = None
    _max: Optional[float] = None
    _x_min: Optional[float] = None
    _x_max: Optional[float] = None
    _multiple_of: Optional[float] = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def min(self, x: float) -> "number":
        return replace(self, _min=x)

    def max(self, x: float) -> "number":
        return replace(self, _max=x)

    def x_min(self, x: float) -> "number":
        return replace(self, _x_min=x)

    def x_max(self, x: float) -> "number":
        return replace(self, _x_max=x)

    def multiple_of(self, x: float) -> "number":
        return replace(self, _multiple_of=x)

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            **remove_none_values(
                {
                    "minimum": self._min,
                    "maximum": self._max,
                    "exclusiveMinimum": self._x_min,
                    "exclusiveMaximum": self._x_max,
                    "multipleOf": self._multiple_of,
                }
            ),
        }


class integer(number):
    pass


class string(typedef):
    _min: Optional[int] = None
    _max: Optional[int] = None
    _pattern: Optional[str] = None
    _format: Optional[str] = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def min(self, n: int) -> "string":
        return replace(self, _min=n)

    def max(self, n: int) -> "string":
        return replace(self, _max=n)

    def pattern(self, p: str) -> "string":
        return replace(self, _pattern=p)

    def format(self, f: str) -> "string":
        return replace(self, _format=f)

    def uuid(self) -> "string":
        return self.format("uuid")

    def email(self) -> "string":
        return self.format("email")

    def uri(self) -> "string":
        return self.format("uri")

    def hostname(self) -> "string":
        return self.format("hostname")

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            **remove_none_values(
                {
                    "minLength": self._min,
                    "maxLength": self._max,
                    "pattern": self._pattern,
                    "format": self._format,
                }
            ),
        }


def uuid() -> string:
    return string().uuid()


def email() -> string:
    return string().email()


def uri() -> string:
    return string().uri()


class struct(typedef):
    props: Dict[str, typedef]
    required: List[str]

    def __init__(self, props=None, **kwargs):
        super().__init__(**kwargs)
        self.props = dict()

        if "required" in kwargs:  # re constructing from data
            if props is None:
                raise Exception("invalid")
            self.required = kwargs["required"]
            self.props = props

        else:
            self.required = []

            for k, v in props.items() if props is not None else []:
                if isinstance(v, optional):
                    v = v.of
                else:
                    self.required.append(k)
                self.props[k] = v

    @property
    def type(self):
        return "object"

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(self.props.values())

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "properties": {k: collector.collect(v) for k, v in self.props.items()},
            "required": self.required,
        }


class array(typedef):
    of: typedef

    _min: Optional[int] = None
    _max: Optional[int] = None
    _unique_items: Optional[bool] = None
    # _min_contains: Optional[int] = None
    # _max_contains: Optional[int] = None

    def __init__(self, of: typedef, **kwargs):
        super().__init__(**kwargs)
        self.of = of

    def min(self, n: int) -> "array":
        return replace(self, _min=n)

    def max(self, n: int) -> "array":
        return replace(self, _max=n)

    def unique_items(self, b: bool) -> "array":
        return replace(self, _unique_items=b)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "items": collector.collect(self.of),
            **remove_none_values(
                {
                    "minItems": self._min,
                    "maxItems": self._max,
                    "uniqueItems": self._unique_items,
                }
            ),
        }


class func(typedef):
    inp: struct
    out: typedef
    mat: Materializer

    # if not safe, output will be typechecked
    safe: bool

    rate_calls: bool
    rate_weight: Optional[int] = None

    def __init__(
        self,
        inp: struct,
        out: typedef,
        mat: Materializer,
        safe=True,
        rate_calls=False,
        rate_weight=None,
        **kwargs,
    ):
        super().__init__(**kwargs)
        self.inp = inp
        self.out = out
        self.mat = mat
        self.safe = safe

        self.runtime = mat.runtime

        self.rate_calls = rate_calls
        self.rate_weight = rate_weight

    def rate(self, weight=None, calls=None):
        return replace(self, rate_weight=weight, rate_calls=calls)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.inp, self.out, self.mat]

    @property
    def type(self) -> str:
        return "function"

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "input": collector.collect(self.inp),
            "output": collector.collect(self.out),
            "materializer": collector.collect(self.mat),
            "rate_weight": self.rate_weight,
            "rate_calls": self.rate_calls,
        }

    # def compose(self, other: "func") -> "func":
    #     assert self.out == other.inp
    #     # what if other == gen?
    #     return func(self, other, IdentityMat())

    # def __mul__(self, other: "func") -> "func":
    #     return self.compose(other)


def gen(out: typedef, mat: Materializer, **kwargs) -> func:
    return func(struct(), out, mat, **kwargs)
