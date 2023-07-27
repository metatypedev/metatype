# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Set,
    Tuple,
    Type,
    TypeVar,
    Union,
    get_args,
    get_origin,
)

from attrs import evolve, field, frozen
from frozendict import frozendict
from typing_extensions import Self

from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.graph.typegraph import TypeGraph, TypegraphContext, find
from typegraph.injection import (
    DynamicValueInjection,
    Injection,
    InjectionDataInit,
    ContextInjection,
    ParentInjection,
    SecretInjection,
    StaticInjection,
    SingleValue,
    init_injection_data,
)
from typegraph.policies import Policy, EffectPolicies
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import SKIP, asdict
import re

# if os.environ.get("DEBUG"):
#     import debugpy

#     debugpy.listen(5678)
#     print("Waiting for debugger attach...")
#     debugpy.wait_for_client()


TypeNode = Union["typedef", NodeProxy]


def remove_none_values(obj):
    return {k: v for k, v in obj.items() if v is not None}


def is_optional(tpe: Type):
    # Optional = Union[T, NoneType]
    return get_origin(tpe) is Union and type(None) in get_args(tpe)


def validate_name(name: str):
    invalids = re.findall("[^_A-Za-z0-9]+", name)
    # print(invalids)
    if bool(invalids):
        raise Exception(f'name "{name}" does not match [_A-Za-z0-9]')


class Secret(Node):
    secret: str

    def __init__(self, secret: str):
        super().__init__(Collector.secrets)
        self.secret = secret

    def data(self, collector: "Collector") -> dict:
        return self.secret  # this is a string


# reserved types are used for internal implementation
# and cannot be used to define user custom types
#
# more information at https://spec.graphql.org/draft/
reserved_types = [
    # Primitives
    "Int",
    "Float",
    "Boolean",
    "String",
    # Operations
    "Query",
    "Mutation",
    "Subscription",
    "Fragment",
    # Extras
    "Date",
    "ID",
    "UUID",
    "URL",
    "Point",
    "PointList",
    "Polygon",
    "MultiPolygon",
]


@frozen
class typedef(Node):
    graph: TypeGraph = field(
        kw_only=True,
        factory=TypegraphContext.get_active,
        init=False,
        metadata={SKIP: True},
    )
    name: str = field(kw_only=True, default="")
    description: Optional[str] = field(kw_only=True, default=None)
    runtime: Optional["Runtime"] = field(kw_only=True, default=None)
    injection: Optional[Injection] = field(kw_only=True, default=None)
    policies: Tuple[Policy, ...] = field(kw_only=True, factory=tuple)
    runtime_config: Dict[str, Any] = field(
        kw_only=True, factory=frozendict, hash=False, metadata={SKIP: True}
    )
    _as_id: bool = field(kw_only=True, default=False)
    _enum: Optional[Tuple[str]] = field(kw_only=True, default=None)

    collector_target: Optional[str] = field(default=Collector.types, init=False)

    def __attrs_post_init__(self):
        if self.graph is None:
            raise Exception("No typegraph context")
        if self.name == "":
            object.__setattr__(self, "name", f"{self.type}_{self.graph.next_type_id()}")

    def overwrite_name(self, name: str):
        object.__setattr__(self, "name", name)

    def replace(self, **changes) -> Self:
        return evolve(self, **changes)

    @property
    def type(self):
        return type(self).__name__

    @property
    def edges(self) -> List[Node]:
        if isinstance(self.injection, SecretInjection):
            if isinstance(self.injection.value, SingleValue):
                secrets = [Secret(self.injection.value.value)]
            else:
                secrets = [secret for secret in self.injection.value.switch.values()]
        else:
            secrets = []

        return (
            super().edges
            + list(self.policies)
            + list(filter(None, [self.runtime]))
            + secrets
        )

    @property
    def labeled_edges(self) -> Dict[str, str]:
        return {}

    def register_name(self):
        types = self.graph.type_by_names
        name = self.name
        if name in types:
            if types[name] != self:
                raise Exception(f"Name '{name}' is already registered for another type")
            return

        if name in reserved_types:
            raise Exception(f"Type name '{name}' is a reserved type")
        # https://spec.graphql.org/draft/#sel-GAJTBAABABFj6D
        if name.startswith("__"):
            raise Exception(
                f"type name {name} cannot start with `__`, it's reserved for introspection"
            )
        types[name] = self

    def named(self, name: str, validate=True) -> Self:
        if validate:
            validate_name(name)
        ret = self.replace(name=name)
        ret.register_name()
        return ret

    @property
    def as_id(self) -> Self:
        return self.replace(as_id=True)

    def describe(self, description: str) -> Self:
        return self.replace(description=description)

    def within(self, runtime):
        if runtime is None:
            raise Exception("cannot set runtime to None")

        if self.runtime is not None and self.runtime != runtime:
            raise Exception(
                f"trying to set a different runtime {runtime}, already is {self.runtime}"
            )

        object.__setattr__(self, "runtime", runtime)
        return self

    def _propagate_runtime(self, runtime: "Runtime", visited: Set["typedef"] = None):
        if visited is None:
            visited = set()
        elif self in visited:
            return
        else:
            visited.add(self)

        if self.runtime is None:
            object.__setattr__(self, "runtime", runtime)

        for e in self.edges:
            if isinstance(e, typedef):
                e._propagate_runtime(self.runtime, visited)
            if isinstance(e, NodeProxy):
                e.get()._propagate_runtime(self.runtime, visited)

    def _set_injection(self, injection: Injection) -> Self:
        if self.injection is not None:
            raise Exception(f"{self.name} can only have one injection")
        return self.replace(injection=injection)

    def set(self, value: InjectionDataInit[Any]):
        import json

        return self._set_injection(
            StaticInjection(init_injection_data(value, str, lambda x: json.dumps(x)))
        )

    def from_secret(self, value: InjectionDataInit[str]):
        return self._set_injection(SecretInjection(init_injection_data(value)))

    def from_parent(self, value: InjectionDataInit[Union["NodeProxy", str]]):
        # TODO: check for same type and value in same context
        return self._set_injection(
            ParentInjection(
                init_injection_data(
                    value, NodeProxy, lambda x: proxy(x) if isinstance(x, str) else x
                )
            )
        )

    def from_context(self, value: InjectionDataInit[str]):
        return self._set_injection(ContextInjection(init_injection_data(value)))

    def inject(self, value: InjectionDataInit[str]):
        return self._set_injection(DynamicValueInjection(init_injection_data(value)))

    def add_policy(
        self,
        *policies: List[Union[Policy, EffectPolicies]],
    ):
        return self.replace(
            policies=self.policies + tuple(Policy.create_from(p) for p in policies)
        )

    def config(self, *flags: str, **kwargs: Any):
        d = dict()
        d.update(self.runtime_config)
        d.update(kwargs)
        d.update({f: True for f in flags})
        return self.replace(runtime_config=frozendict(d))

    def enum(self, variants: List[Any]) -> Self:
        import json

        return self.replace(enum=tuple(json.dumps(variant) for variant in variants))

    def data(self, collector) -> dict:
        if self.runtime is None:
            raise Exception("Expected Runtime, got None")

        ret = remove_none_values(asdict(self))
        ret["type"] = self.type
        ret["title"] = ret.pop("name")
        ret["as_id"] = ret.pop("_as_id")
        ret["runtime"] = collector.index(self.runtime)
        ret["policies"] = [
            p.data(collector) if isinstance(p, EffectPolicies) else collector.index(p)
            for p in self.policies
        ]

        if self.injection is not None:
            ret["injection"] = self.injection.data(collector)

        config = self.runtime.get_type_config(self)
        if len(config) > 0:
            ret["config"] = config

        if hasattr(type(self), "constraint_data"):
            ret.update(self.constraint_data())

        if self._enum is not None:
            ret["enum"] = ret.pop("_enum")

        ret.pop("collector_target")

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


#
# Type constraints

TYPE_CONSTRAINT = "__type_constraint_name"


def constraint(name: Optional[str] = None, **kwargs):
    # Additional constraint on type: Validation keyword.
    # Field to be manually set on the serialization.
    return field(
        kw_only=True,
        default=None,
        metadata={SKIP: True, TYPE_CONSTRAINT: name or True},
        **kwargs,
    )


Cls = TypeVar("Cls", bound=typedef)


def with_constraints(cls: Type[Cls]) -> Type[Cls]:
    if not hasattr(cls, "__attrs_attrs__"):
        raise Exception(
            "@with_constraints decorator requires class to have attribute '__attrs_attrs__'"
        )
    if not issubclass(cls, typedef):
        raise Exception("@with_constraints decorator requires a subclass of 'typedef'")

    constraints = {}

    def get_setter(name: str):
        def setter(self, value):
            return self.replace(**{name: value})

        return setter

    for f in cls.__attrs_attrs__:
        if f.metadata is not None and TYPE_CONSTRAINT in f.metadata:
            if not f.name.startswith("_"):
                raise Exception(
                    f"constraint field name '{f.name}' expected to start with an underscore"
                )
            name = f.name[1:]
            key = f.metadata.get(TYPE_CONSTRAINT)
            if isinstance(key, bool) and key:
                key = name
            constraints[key] = f.name

            setattr(cls, name, get_setter(name))

    if len(constraints) > 0:

        def constraint_data(self):
            return remove_none_values(
                {key: getattr(self, name) for key, name in constraints.items()}
            )

        def _constraints(self):
            return remove_none_values(
                {name[1:]: getattr(self, name) for name in constraints.values()}
            )

        setattr(cls, "constraint_data", constraint_data)
        setattr(cls, "_constraints", _constraints)

    return cls


# end - Type constraints


@frozen
class optional(typedef):
    of: TypeNode
    default_value: Optional[str] = field(hash=False, default=None)

    def default(self, value):
        if self.default_value is not None:
            raise Exception(f"{self.name} can only have one injection")

        return self.replace(default_value=value)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    @property
    def labeled_edges(self) -> Dict[str, str]:
        return {"[item]": self.of.name}

    def data(self, collector) -> dict:
        ret = super().data(collector)
        ret["item"] = collector.index(ret.pop("of"))
        return ret


@frozen
class boolean(typedef):
    pass


@with_constraints
@frozen
class number(typedef):
    """See [`t.number()`](/docs/reference/type-system#tnumber)"""

    _min: Optional[float] = constraint("minimum")
    _max: Optional[float] = constraint("maximum")
    _x_min: Optional[float] = constraint("exclusiveMinimum")
    _x_max: Optional[float] = constraint("exclusiveMaximum")
    _multiple_of: Optional[float] = constraint("multipleOf")


def float() -> number:
    return number()


@frozen
class integer(number):
    """See [`t.integer()`](/docs/reference/type-system#tinteger)"""

    pass


@with_constraints
@frozen
class string(typedef):
    _min: Optional[int] = constraint("minLength")
    _max: Optional[int] = constraint("maxLength")
    _pattern: Optional[str] = constraint()
    _format: Optional[str] = constraint()

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
    return string().format("phone")


def enum(variants: List[str]) -> string:
    return string().enum(variants)


@with_constraints
@frozen
class file(typedef):
    _min: Optional[int] = constraint("minSize")
    _max: Optional[int] = constraint("maxSize")
    _allow: Optional[Tuple[str, ...]] = constraint(
        "mimeTypes", converter=lambda v: v and tuple(v)
    )


def validate_struct_props(instance, attribute, props):
    for tpe in props.values():
        if not isinstance(tpe, typedef) and not isinstance(tpe, NodeProxy):
            raise Exception(
                f"expected typedef or NodeProxy, got {type(tpe).__name__}: {props}"
            )


@with_constraints
@frozen
class struct(typedef):
    props: Dict[str, TypeNode] = field(
        validator=[validate_struct_props], factory=frozendict, converter=frozendict
    )
    additional_props: Optional[Union[bool, TypeNode]] = None
    _min: Optional[int] = constraint("minProperties")
    _max: Optional[int] = constraint("maxProperties")
    # _dependentRequired

    def __attrs_post_init__(self):
        super().__attrs_post_init__()
        if self.__class__ != struct:
            # TODO implement recursive props resolution for parent class
            # https://en.wikipedia.org/wiki/C3_linearization
            if len(self.__class__.__bases__) > 1:
                raise Exception("multiple inheritance is currently not supported")
            (base,) = self.__class__.__bases__
            child_cls = self.__class__
            child_attr = set([i for i in vars(child_cls) if not i.startswith("__")])
            parent_attr = set([i for i in vars(base) if not i.startswith("__")])

            # reserved field check
            reserved_attr = set(vars(struct)).union(vars(typedef))
            common = sorted(reserved_attr.intersection(child_attr))
            if len(common) > 0:
                err_msg = ", ".join(common)
                if len(common) == 1:
                    err_msg += " is a reserved field"
                else:
                    err_msg += " are reserved fields"
                raise Exception(err_msg)
            self_attr = child_attr
            if base != struct:
                # child.props should inherit parent.props
                curr_base = base
                while curr_base != struct:
                    if len(curr_base.__bases__) > 1:
                        raise Exception(
                            "multiple inheritance is currently not supported"
                        )
                    (curr_base,) = curr_base.__bases__
                    fields = set([i for i in vars(curr_base) if not i.startswith("__")])
                    parent_attr = parent_attr.union(fields)
                self_attr = self_attr.union(parent_attr)
            props = {}
            for attr in sorted(self_attr):
                value = getattr(self, attr)
                if isinstance(value, typedef):
                    props[attr] = value
            # self.overwrite_name(self.__class__.__name__)
            object.__setattr__(self, "props", frozendict(props))

    def additional(self, t: Union[bool, TypeNode]):
        return self.replace(additional_props=t)

    # creates a duplicate type with no runtime
    def detach(self):
        return self.replace(
            name=f"{self.type}_{self.graph.next_type_id()}", runtime=None
        )

    def compose(self, props: Dict[str, typedef]):
        new_props = dict(self.props)
        new_props.update(props)
        return self.replace(
            props=frozendict(new_props), name=f"{self.type}_{self.graph.next_type_id()}"
        )

    def __getattr__(self, attr):
        try:
            if attr == "props":
                return self.props
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

    @property
    def labeled_edges(self) -> Dict[str, str]:
        return {k: v.name for k, v in self.props.items()}

    def data(self, collector) -> dict:
        ret = super().data(collector)
        if self.additional_props is not None:
            ret["additional_props"] = (
                collector.index(self.additional_props)
                if isinstance(self.additional_props, Node)
                else self.additional_props
            )
        ret["properties"] = {k: collector.index(v) for k, v in ret.pop("props").items()}
        return ret


def any_object() -> struct:
    return struct().additional(True)


@with_constraints
@frozen
class array(typedef):
    of: TypeNode

    _min: Optional[int] = constraint("minItems")
    _max: Optional[int] = constraint("maxItems")
    _unique_items: Optional[bool] = constraint("uniqueItems")
    # _min_contains: Optional[int] = None
    # _max_contains: Optional[int] = None

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.of]

    @property
    def labeled_edges(self):
        return {"[items]": self.of.name}

    def data(self, collector) -> dict:
        ret = super().data(collector)
        ret["items"] = collector.index(ret.pop("of"))
        return ret


@frozen
class union(typedef):
    """A `union` type represents a general union with the variants provided.

    The `union` type is equivalent to the `anyOf` field in JSON Schema where
    the given data must be valid against one or more of the given subschemas.
    """

    variants: List[TypeNode] = list()

    def __hash__(self):
        return hash(tuple(self.variants))

    @property
    def edges(self) -> List[Node]:
        nodes = super().edges + list(self.variants)
        return nodes

    def data(self, collector: Collector) -> dict:
        ret = super().data(collector)
        ret["anyOf"] = [collector.index(v) for v in ret.pop("variants")]
        return ret


@frozen
class either(typedef):
    """An `either` type represents a disjoint union with the variants provided.

    The `either` type is equivalent to the `oneOf` field in JSON Schema where
    the given data must be valid against exactly one of the given subschemas.
    """

    variants: List[TypeNode] = list()

    def __hash__(self):
        return hash(tuple(self.variants))

    @property
    def edges(self) -> List[Node]:
        nodes = super().edges + list(self.variants)
        return nodes

    def data(self, collector: Collector) -> dict:
        ret = super().data(collector)
        ret["oneOf"] = [collector.index(v) for v in ret.pop("variants")]
        return ret


def ipv4() -> string:
    return string().format("ipv4")


def ipv6() -> string:
    return string().format("ipv6")


def ip() -> union:
    return union([ipv4(), ipv6()])


@frozen
class any(typedef):
    pass


@frozen
class func(typedef):
    inp: TypeNode
    out: TypeNode
    mat: Materializer

    # if not safe, output will be typechecked
    safe: bool = field(kw_only=True, default=True)

    rate_calls: bool = field(kw_only=True, default=False)
    rate_weight: Optional[int] = field(kw_only=True, default=None)

    def __attrs_post_init__(self):
        super().__attrs_post_init__()
        object.__setattr__(self, "runtime", self.mat.runtime)

    def rate(self, weight=None, calls=False):
        return self.replace(rate_weight=weight, rate_calls=calls)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.inp, self.out, self.mat]

    @property
    def labeled_edges(self) -> Dict[str, str]:
        return {"[in]": self.inp.name, "[out]": self.out.name}

    @property
    def type(self) -> str:
        return "function"

    def data(self, collector) -> dict:
        ret = super().data(collector)
        inp = ret.pop("inp")
        if isinstance(inp, NodeProxy):
            inp = inp.get()
        if not isinstance(inp, struct):
            raise Exception(f"invalid input type, expected struct got {inp.name}")
        ret["input"] = collector.index(inp)
        ret["output"] = collector.index(ret.pop("out"))
        ret["materializer"] = collector.index(ret.pop("mat"))
        return ret

    # this is not function composition
    def compose(self, out: Dict[str, typedef]):
        if not isinstance(self.out, struct):
            raise Exception("Output required to be a struct.")
        return self.replace(out=self.out.compose(out))

    # def compose(self, other: "func") -> "func":
    #     assert self.out == other.inp
    #     # what if other == gen?
    #     return func(self, other, PredefinedFunMat("identity"))

    # def __mul__(self, other: "func") -> "func":
    #     return self.compose(other)


def gen(out: typedef, mat: Materializer, **kwargs) -> func:
    return func(struct(), out, mat, **kwargs)


# single instance
def named(name: str, define: Callable[[], typedef]) -> TypeNode:
    defined = find(name)
    validate_name(name)
    if defined is not None:
        return defined
    else:
        return define().named(name)


def proxy(name: str) -> NodeProxy:
    g = TypegraphContext.get_active()
    if g is None:
        raise Exception("Active typegraph context required for 't.proxy'")
    return NodeProxy(g, name)


def visit_reversed(
    tpe: typedef, fn: Callable[[typedef], Any], visited: Set[str] = set()
):
    for node in tpe.edges:
        if isinstance(node, typedef):
            if node.name in visited:
                continue
            visited.add(node.name)
            visit_reversed(node, fn, visited)
            fn(node)
