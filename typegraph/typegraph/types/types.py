# Copyright Metatype under the Elastic License 2.0.
from copy import deepcopy
from types import NoneType
from typing import Any
from typing import Callable
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
from typegraph.graphs.typegraph import find
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypeGraph
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.policies import Policy
from typing_extensions import Self


# if os.environ.get("DEBUG"):
#     import debugpy

#     debugpy.listen(5678)
#     print("Waiting for debugger attach...")
#     debugpy.wait_for_client()


TypeNode = Union["typedef", NodeProxy]


class NoCopy:
    tg: "TypeGraph"

    def __init__(self):
        self.tg = TypegraphContext.get_active()

    def __enter__(self):
        self.tg._no_copy = True

    def __exit__(self, exc_type, exc_value, exc_tb):
        self.tg._no_copy = False


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
    inject: Optional[Union[str, TypeNode]]
    injection: Optional[Any]
    policies: Tuple[Policy, ...]
    runtime_config: Dict[str, Any]
    _enum: Optional[List[Any]]

    def __init__(
        self,
        graph: Optional[TypeGraph] = None,
        runtime: Optional["Runtime"] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        inject: Optional[Union[str, TypeNode]] = None,
        injection: Optional[Any] = None,
        policies: Optional[Tuple[Policy, ...]] = None,
        runtime_config: Optional[dict[str, Any]] = None,  # runtime-specific data
        _enum: Optional[List[Any]] = None,
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
            # self.graph.register(self)
        else:
            self.graph = graph

        # TODO ensure subclass type
        self.name = f"{self.type}_{self.graph.next_type_id()}" if name is None else name
        self.description = description
        self.runtime = runtime
        self.inject = inject
        self.injection = None if self.inject is None else injection
        self.policies = tuple() if policies is None else policies
        self.runtime_config = runtime_config if runtime_config is not None else dict()
        self._enum = _enum

    def replace(self, **kwargs):
        if self.graph._no_copy:
            for k, v in kwargs.items():
                setattr(self, k, v)
            return self
        else:
            fields = {k: deepcopy(v) for k, v in vars(self).items() if k not in kwargs}
            fields.update(**kwargs)
            return type(self)(**fields)

    def __deepcopy__(self, memo):
        return self

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
        types = self.graph.type_by_names
        # TODO compare types
        if name in types:
            raise Exception(f"type name {name} already used")
        ret = self.replace(name=name)
        self.graph.type_by_names[name] = ret
        return ret

    def describe(self, description: str) -> "typedef":
        return self.replace(description=description)

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
            if isinstance(e, NodeProxy):
                e.get()._propagate_runtime(self.runtime, visited)

    def set(self, value):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(injection="raw", inject=orjson.dumps(value).decode())

    def from_secret(self, secret_name):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(injection="secret", inject=Secret(secret_name))

    def from_parent(self, sibiling: "NodeProxy"):
        # TODO: check for same type and value in same context
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(injection="parent", inject=sibiling)

    def from_context(self, claim: str):
        if self.inject is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(injection="context", inject=claim)

    def add_policy(
        self,
        *policies: List["Policy"],
    ):
        return self.replace(policies=self.policies + policies)

    def config(self, *flags: str, **kwargs: Any):
        d = self.runtime_config | kwargs | {f: True for f in flags}
        return self.replace(runtime_config=d)

    def enum(self, variants: List[Any]) -> Self:
        return self.replace(_enum=variants)

    def data(self, collector) -> dict:
        if self.runtime is None:
            raise Exception("Expected Runtime, got None")

        ret = {
            "type": self.type,
            "title": self.name,
            "runtime": collector.index(self.runtime),
            "policies": [collector.index(p) for p in self.policies],
            **remove_none_values(dict(enum=self._enum)),
        }
        if self.description is not None:
            ret["description"] = self.description

        if self.inject is not None:
            ret["injection"] = self.injection
            if self.injection == "parent":
                ret["inject"] = collector.index(self.inject)
            elif self.injection == "secret":
                ret["inject"] = self.inject.secret
            else:
                ret["inject"] = self.inject

        config = self.runtime.get_type_config(self)
        if len(config) > 0:
            ret["config"] = config

        return ret

    def optional(self, default_value: Optional[Any] = None) -> "optional":
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
    of: TypeNode
    default_value: Optional[Any] = None

    def __init__(self, of: TypeNode, **kwargs):
        super().__init__(**kwargs)
        self.of = of

    def default(self, value):
        if self.default_value is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(default_value=value)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "item": collector.index(self.of),
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
        return self.replace(_min=x)

    def max(self, x: float) -> "number":
        return self.replace(_max=x)

    def x_min(self, x: float) -> "number":
        return self.replace(_x_min=x)

    def x_max(self, x: float) -> "number":
        return self.replace(_x_max=x)

    def multiple_of(self, x: float) -> "number":
        return self.replace(_multiple_of=x)

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


def float() -> number:
    return number()


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
        return self.replace(_min=n)

    def max(self, n: int) -> "string":
        return self.replace(_max=n)

    def pattern(self, p: str) -> "string":
        return self.replace(_pattern=p)

    def format(self, f: str) -> "string":
        return self.replace(_format=f)

    def uuid(self) -> "string":
        return self.format("uuid")

    def email(self) -> "string":
        return self.format("email")

    def uri(self) -> "string":
        return self.format("uri")

    def json(self) -> "string":
        return self.format("json")

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


def json() -> string:
    return string().json()


def ean() -> string:
    return string().format("ean")


def path() -> string:
    return string().format("path")


def datetime() -> string:
    return string().format("date-time")


def date() -> string:
    return string().format("date")


def phone() -> string:
    # TODO replace with the phone number pattern when typechecking
    return string().format("phone")


class struct(typedef):
    props: Dict[str, TypeNode]
    additional_props: Optional[Union[bool, TypeNode]] = None
    _min: Optional[int] = None
    _max: Optional[int] = None
    # _dependentRequired

    def __init__(self, props=None, **kwargs):
        super().__init__(**kwargs)
        self.props = props if props is not None else dict()

        # validation
        # TODO only when called directly (excluding reconstruction with `replace`)
        for tpe in self.props.values():
            if not isinstance(tpe, typedef) and not isinstance(tpe, NodeProxy):
                raise Exception(
                    f"expected typedef or NodeProxy, got {type(tpe).__name__}"
                )

    def min(self, n: int) -> "struct":
        return self.replace(_min=n)

    def max(self, n: int) -> "struct":
        return self.replace(_max=n)

    def additional(self, t: Union[bool, TypeNode]):
        return self.replace(additional_props=t)

    def compose(self, props: Dict[str, typedef]):
        return self.replace(props=self.props | props)

    def __getattr__(self, attr):
        try:
            return super().__getattr__(attr)
        except AttributeError:
            pass

        if attr in self.props:
            return self.props[attr]

        raise Exception(f'no prop named "{attr}" in type {self}')

    @property
    def type(self):
        return "object"

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(self.props.values())

    def data(self, collector) -> dict:
        # collect NodeProxy and typedef
        additional_props = (
            collector.index(self.additional_props)
            if isinstance(self.additional_props, Node)
            else self.additional_props
        )
        return {
            **super().data(collector),
            "properties": {k: collector.index(v) for k, v in self.props.items()},
            **remove_none_values(
                {
                    "minProperties": self._min,
                    "maxProperties": self._max,
                    "additionalProperties": additional_props,
                }
            ),
        }


def any_object() -> struct:
    return struct().additional(True)


class array(typedef):
    of: TypeNode

    _min: Optional[int] = None
    _max: Optional[int] = None
    _unique_items: Optional[bool] = None
    # _min_contains: Optional[int] = None
    # _max_contains: Optional[int] = None

    def __init__(self, of: TypeNode, **kwargs):
        super().__init__(**kwargs)
        self.of = of

    def min(self, n: int) -> "array":
        return self.replace(_min=n)

    def max(self, n: int) -> "array":
        return self.replace(_max=n)

    def unique_items(self, b: bool) -> "array":
        return self.replace(_unique_items=b)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    def data(self, collector) -> dict:
        return {
            **super().data(collector),
            "items": collector.index(self.of),
            **remove_none_values(
                {
                    "minItems": self._min,
                    "maxItems": self._max,
                    "uniqueItems": self._unique_items,
                }
            ),
        }


class union(typedef):
    variants: List[TypeNode]

    def __init__(self, variants: List[TypeNode], **kwargs):
        super().__init__(**kwargs)
        self.variants = variants

    @property
    def edges(self) -> List[Node]:
        return super().edges + self.variants

    def data(self, collector: Collector) -> dict:
        return {
            **super().data(collector),
            "anyOf": [collector.index(v) for v in self.variants],
        }


def ipv4() -> string:
    return string().format("ipv4")


def ipv6() -> string:
    return string().format("ipv6")


def ip() -> union:
    return union([ipv4(), ipv6()])


class any(typedef):
    pass


class func(typedef):
    inp: TypeNode
    out: TypeNode
    mat: Materializer

    # if not safe, output will be typechecked
    safe: bool

    rate_calls: bool
    rate_weight: Optional[int] = None

    def __init__(
        self,
        inp: TypeNode,
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

    def rate(self, weight=None, calls=False):
        return self.replace(rate_weight=weight, rate_calls=calls)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.inp, self.out, self.mat]

    @property
    def type(self) -> str:
        return "function"

    def data(self, collector) -> dict:
        inp = self.inp.get() if isinstance(self.inp, NodeProxy) else self.inp
        if not isinstance(inp, struct):
            raise Exception(f"invalid input type, expected struct got {inp.name}")
        return {
            **super().data(collector),
            "input": collector.index(inp),
            "output": collector.index(self.out),
            "materializer": collector.index(self.mat),
            "rate_weight": self.rate_weight,
            "rate_calls": self.rate_calls,
        }

    # this is not function composition
    def compose(self, out: Dict[str, typedef]):
        if not isinstance(self.out, struct):
            raise Exception("Output required to be a struct.")
        return self.replace(out=self.out.compose(out))

    # def compose(self, other: "func") -> "func":
    #     assert self.out == other.inp
    #     # what if other == gen?
    #     return func(self, other, IdentityMat())

    # def __mul__(self, other: "func") -> "func":
    #     return self.compose(other)


def gen(out: typedef, mat: Materializer, **kwargs) -> func:
    return func(struct(), out, mat, **kwargs)


# single instance
def named(name: str, define: Callable[[], typedef]) -> TypeNode:
    defined = find(name)
    if defined is not None:
        return defined
    else:
        return define().named(name)
