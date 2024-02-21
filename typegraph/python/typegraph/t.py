# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json as JsonLib
from typing import Any, Dict, List, Optional, Tuple, Union
import copy

from typing_extensions import Self

from typegraph.effects import EffectType
from typegraph.gen.exports.core import (
    FuncParams,
    ParameterTransform,
    TypeList,
    TypeBase,
    TypeEither,
    TypeFile,
    TypeFloat,
    TypeFunc,
    TypeInteger,
    TypeOptional,
    TypeString,
    TypeStruct,
    TypeUnion,
    PolicySpec as WitPolicySpec,
)
from typegraph.gen.exports.runtimes import EffectRead
from typegraph.gen.exports.utils import Reduce
from typegraph.gen.types import Err
from typegraph.graph.typegraph import (
    core,
    store,
    ApplyFromArg,
    ApplyFromContext,
    ApplyFromParent,
    ApplyFromSecret,
    ApplyFromStatic,
)
from typegraph.injection import (
    serialize_generic_injection,
    serialize_parent_injection,
    serialize_static_injection,
)
from typegraph.policy import Policy, PolicyPerEffect, PolicySpec, get_policy_chain
from typegraph.runtimes.deno import Materializer
from typegraph.utils import (
    ConfigSpec,
    build_reduce_data,
    serialize_config,
)
from typegraph.wit import wit_utils

# TODO: better approach?
og_list = list


class typedef:
    id: int
    runtime_config: Optional[List[Tuple[str, str]]]
    injection: Optional[str]
    policy_chain: Optional[List[WitPolicySpec]]
    name: Optional[str]

    def __init__(self, id: int):
        self.id = id
        self.runtime_config = None
        self.injection = None
        self.policy_chain = None
        self.name = None

    def __repr__(self):
        res = core.get_type_repr(store, self.id)
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value

    def with_policy(self, *policies: Optional[PolicySpec]) -> Self:
        policy_chain = get_policy_chain(policies)
        res = core.with_policy(store, self.id, policy_chain)
        if isinstance(res, Err):
            raise Exception(res.value)

        ret = copy.copy(self)
        ret.id = res.value
        ret.policy_chain = policy_chain
        return ret

    def rename(self, name: str) -> Self:
        res = core.rename_type(store, self.id, name)

        if isinstance(res, Err):
            raise Exception(res.value)

        ret = copy.copy(self)
        ret.id = res.value
        ret.name = name
        return ret

    def _with_injection(self, injection: str) -> Self:
        res = core.with_injection(store, self.id, injection)
        if isinstance(res, Err):
            raise Exception(res.value)

        ret = copy.copy(self)
        ret.id = res.value
        ret.injection = injection
        return ret

    def optional(
        self,
        default_value: Optional[Any] = None,
        config: Optional[ConfigSpec] = None,
    ) -> "optional":
        if isinstance(self, optional):
            return self
        return optional(self, default_item=default_value, config=config)

    def set(self, value: Union[any, Dict[EffectType, any]]):
        return self._with_injection(serialize_static_injection(value))

    def inject(self, value: Union[any, Dict[EffectType, any]]):
        return self._with_injection(serialize_generic_injection("dynamic", value))

    def from_context(self, value: Union[str, Dict[EffectType, str]]):
        return self._with_injection(serialize_generic_injection("context", value))

    def from_secret(self, value: Union[str, Dict[EffectType, str]]):
        return self._with_injection(serialize_generic_injection("secret", value))

    def from_parent(self, value: Union[str, Dict[EffectType, str]]):
        return self._with_injection(serialize_parent_injection(value))

    def from_random(self):
        return self._with_injection(serialize_generic_injection("random", None))


class _TypeWithPolicy(typedef):
    base: "typedef"
    policy: Tuple[Union[Policy, PolicyPerEffect], ...]

    def __init__(
        self,
        id: int,
        base: "typedef",
        policy: Tuple[Union[Policy, PolicyPerEffect], ...],
    ):
        super().__init__(id)
        self.base = base
        self.policy = policy

    def __getattr__(self, name):
        if name == "policy":
            return self.policy
        return getattr(self.base, name)


# self.id refer to the wrapper id
# self.* refer to the base id
class _TypeWrapper(typedef):
    base: "typedef"

    def __init__(
        self,
        id: int,
        base: "typedef",
    ):
        super().__init__(id)
        self.base = base

    def __getattr__(self, name):
        if name == "id":
            return self.id
        return getattr(self.base, name)


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None
    exclusive_minimum: Optional[int] = None
    exclusive_maximum: Optional[int] = None
    multiple_of: Optional[int] = None
    enumeration: Optional[List[int]] = None
    as_id: bool

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        exclusive_minimum: Optional[int] = None,
        exclusive_maximum: Optional[int] = None,
        multiple_of: Optional[int] = None,
        enum: Optional[List[int]] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
        as_id: bool = False,
    ):
        data = TypeInteger(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
            enumeration=enum,
        )
        runtime_config = serialize_config(config)
        # raise Exception(runtime_config)
        res = core.integerb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=as_id),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of
        self.enumeration = enum
        self.runtime_config = runtime_config
        self.as_id = as_id


class float(typedef):
    min: Optional[float] = None
    max: Optional[float] = None
    exclusive_minimum: Optional[float] = None
    exclusive_maximum: Optional[float] = None
    multiple_of: Optional[float] = None
    enumeration: Optional[List[float]] = None

    def __init__(
        self,
        *,
        min: Optional[float] = None,
        max: Optional[float] = None,
        exclusive_minimum: Optional[float] = None,
        exclusive_maximum: Optional[float] = None,
        multiple_of: Optional[float] = None,
        enum: Optional[List[float]] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeFloat(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
            enumeration=enum,
        )
        runtime_config = serialize_config(config)
        res = core.floatb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of
        self.enumeration = enum
        self.runtime_config = runtime_config


class boolean(typedef):
    def __init__(
        self, *, name: Optional[str] = None, config: Optional[ConfigSpec] = None
    ):
        runtime_config = serialize_config(config)
        res = core.booleanb(
            store, TypeBase(name=name, runtime_config=runtime_config, as_id=False)
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.runtime_config = runtime_config


class string(typedef):
    min: Optional[int] = None
    max: Optional[int] = None
    pattern: Optional[str] = None
    format: Optional[str] = None
    enumeration: Optional[List[str]] = None
    as_id: bool

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        pattern: Optional[str] = None,
        format: Optional[str] = None,
        enum: Optional[List[str]] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
        as_id: bool = False,
    ):
        enum_variants = None
        if enum is not None:
            enum_variants = og_list(JsonLib.dumps(variant) for variant in enum)

        data = TypeString(
            min=min, max=max, pattern=pattern, format=format, enumeration=enum_variants
        )

        runtime_config = serialize_config(config)
        res = core.stringb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=as_id),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.pattern = pattern
        self.format = format
        self.enumeration = enum
        self.runtime_config = runtime_config
        self.as_id = as_id


def uuid(
    *,
    config: Optional[ConfigSpec] = None,
    as_id: bool = False,
    name: Optional[str] = None,
) -> string:
    return string(format="uuid", config=config, as_id=as_id, name=name)


def email(
    *,
    config: Optional[Optional[ConfigSpec]] = None,
    as_id: bool = False,
    name: Optional[str] = None,
) -> string:
    return string(format="email", config=config, as_id=as_id, name=name)


def uri() -> string:
    return string(format="uri")


def ean() -> string:
    return string(format="ean")


def path() -> string:
    return string(format="path")


def date() -> string:
    return string(format="date")


def datetime() -> string:
    return string(format="date-time")


def json() -> string:
    return string(format="json")


def enum(
    variants: List[str],
    name: Optional[str] = None,
):
    return string(enum=variants, name=name)


class file(typedef):
    min: Optional[int] = None
    max: Optional[int] = None
    allow: Optional[List[str]]

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        allow: Optional[List[str]] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeFile(
            min=min,
            max=max,
            allow=allow,
        )

        runtime_config = serialize_config(config)
        res = core.fileb(
            store,
            data,
            TypeBase(name=None, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)

        super().__init__(res.value)
        self.min = min
        self.max = max
        self.allow = allow


class list(typedef):
    items: typedef = None
    min: Optional[int] = None
    max: Optional[int] = None
    unique_items: Optional[bool] = None

    def __init__(
        self,
        items: typedef,
        min: Optional[int] = None,
        max: Optional[int] = None,
        unique_items: Optional[bool] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeList(
            of=items.id,
            min=min,
            max=max,
            unique_items=unique_items,
        )

        runtime_config = serialize_config(config)
        res = core.listb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.items = items
        self.unique_items = unique_items
        self.runtime_config = runtime_config


class optional(typedef):
    item: Optional[typedef] = None
    default_item: Optional[str] = None

    def __init__(
        self,
        item: typedef,
        default_item: Optional[Any] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeOptional(
            of=item.id,
            default_item=None if default_item is None else JsonLib.dumps(default_item),
        )

        runtime_config = serialize_config(config)
        res = core.optionalb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.item = item
        self.default_item = default_item
        self.runtime_config = runtime_config


class union(typedef):
    variants: List[typedef] = []

    def __init__(
        self,
        variants: List[typedef],
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeUnion(variants=og_list(map(lambda v: v.id, variants)))

        runtime_config = serialize_config(config)
        res = core.unionb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.variants = variants
        self.runtime_config = runtime_config


class either(typedef):
    variants: List[typedef] = []

    def __init__(
        self,
        variants: List[typedef],
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
    ):
        data = TypeEither(variants=og_list(map(lambda v: v.id, variants)))

        runtime_config = serialize_config(config)
        res = core.eitherb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.variants = variants
        self.runtime_config = runtime_config


class struct(typedef):
    props: Dict[str, typedef]
    additional_props: bool
    min: Optional[int]
    max: Optional[int]
    enumeration: Optional[List[int]] = None

    def __init__(
        self,
        props: Optional[Dict[str, typedef]] = None,
        *,
        additional_props: bool = False,
        min: Optional[int] = None,
        max: Optional[int] = None,
        name: Optional[str] = None,
        config: Optional[ConfigSpec] = None,
        enum: Optional[List[Dict[str, Any]]] = None,
    ):
        if self.__class__ != struct:  # custom class
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

        else:
            props = props or {}

        data = TypeStruct(
            props=og_list((name, tpe.id) for (name, tpe) in props.items()),
            additional_props=additional_props,
            min=min,
            max=max,
            enumeration=[JsonLib.dumps(v) for v in enum] if enum else None,
        )

        runtime_config = serialize_config(config)
        res = core.structb(
            store,
            data,
            base=TypeBase(name=name, runtime_config=runtime_config, as_id=False),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.props = props
        self.runtime_config = runtime_config
        self.enumeration = enum

    def extend(self, props: Dict[str, typedef]):
        return struct(props={**self.props, **props})


ApplyParamObjectNode = Dict[str, "ApplyParamNode"]
ApplyParamArrayNode = List["ApplyParamNode"]
ApplyParamLeafNode = Union[
    ApplyFromArg, ApplyFromStatic, ApplyFromContext, ApplyFromSecret, ApplyFromParent
]

ApplyParamNode = Union[ApplyParamObjectNode, ApplyParamArrayNode, ApplyParamLeafNode]


def serialize_apply_param_node(node: ApplyParamNode) -> Any:
    if isinstance(node, ApplyFromArg):
        return {"source": "arg", "name": node.name}
    if isinstance(node, ApplyFromStatic):
        return {"source": "static", "value": JsonLib.dumps(node.value)}
    if isinstance(node, ApplyFromContext):
        return {"source": "context", "key": node.key}
    if isinstance(node, ApplyFromSecret):
        return {"source": "secret", "key": node.key}
    if isinstance(node, ApplyFromParent):
        return {"source": "parent", "type_name": node.type_name}
    if isinstance(node, dict):
        return {
            "type": "object",
            "fields": {k: serialize_apply_param_node(v) for k, v in node.items()},
        }
    if isinstance(node, (og_list, tuple)):
        return {"type": "array", "items": [serialize_apply_param_node(v) for v in node]}

    raise Exception(f"unexpected node type: node={node}")


class func(typedef):
    inp: Union[struct, typedef]
    out: typedef
    mat: Materializer
    rate_calls: bool
    rate_weight: Optional[int]
    parameter_transform: Optional[ParameterTransform]

    def __init__(
        self,
        inp: Union[struct, typedef],
        out: typedef,
        mat: Materializer,
        /,
        rate_calls: bool = False,
        rate_weight: Optional[int] = None,
        parameter_transform: Optional[ParameterTransform] = None,
    ):
        data = TypeFunc(
            inp=inp.id,
            out=out.id,
            parameter_transform=parameter_transform,
            mat=mat.id,
            rate_calls=rate_calls,
            rate_weight=rate_weight,
        )
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value
        super().__init__(id)
        self.inp = inp
        self.out = out
        self.mat = mat
        self.rate_calls = rate_calls
        self.rate_weight = rate_weight
        self.parameter_transform = parameter_transform

    def rate(self, calls: bool = False, weight: Optional[int] = None) -> "func":
        return func(
            self.inp,
            self.out,
            self.mat,
            parameter_transform=self.parameter_transform,
            rate_calls=calls,
            rate_weight=weight,
        )

    def extend(self, props: Dict[str, typedef]):
        res = core.extend_struct(
            store, self.out.id, og_list((k, v.id) for k, v in props.items())
        )
        if isinstance(res, Err):
            raise Exception(res.value)

        out = typedef(res.value)

        return func(
            self.inp,
            out,
            self.mat,
            parameter_transform=self.parameter_transform,
            rate_calls=self.rate_calls,
            rate_weight=self.rate_weight,
        )

    def reduce(self, value: Dict[str, Any]) -> "func":
        data = Reduce(paths=build_reduce_data(value, [], []))
        reduced_id = wit_utils.gen_reduceb(store, self.inp.id, data=data)

        if isinstance(reduced_id, Err):
            raise Exception(reduced_id.value)

        # TODO typedef(...).as_struct()
        return func(
            typedef(id=reduced_id.value),
            self.out,
            self.mat,
            parameter_transform=self.parameter_transform,
            rate_calls=self.rate_calls,
            rate_weight=self.rate_weight,
        )

    def apply(self, value: ApplyParamObjectNode) -> "func":
        serialized = serialize_apply_param_node(value)
        assert isinstance(serialized, dict)
        assert serialized["type"] == "object"
        transform_tree = JsonLib.dumps(serialized["fields"])

        transform_data = core.get_transform_data(store, self.inp.id, transform_tree)
        if isinstance(transform_data, Err):
            import sys

            print(transform_tree, file=sys.stderr)
            raise Exception(transform_data.value)

        return func(
            typedef(transform_data.value.query_input),
            self.out,
            self.mat,
            parameter_transform=transform_data.value.parameter_transform,
            rate_calls=self.rate_calls,
            rate_weight=self.rate_weight,
        )

    @staticmethod
    def from_type_func(
        data: FuncParams, rate_calls: bool = False, rate_weight: Optional[int] = None
    ) -> "func":
        # Note: effect is a just placeholder
        # in the deno frontend, we do not have to fill the effect attribute on materializers
        mat = Materializer(id=data.mat, effect=EffectRead())
        return func(
            typedef(id=data.inp),
            typedef(id=data.out),
            mat,
            rate_calls=rate_calls,
            rate_weight=rate_weight,
            parameter_transform=None,
        )


def gen(
    out: typedef,
    mat: Materializer,
    rate_calls: bool = False,
    rate_weight: Optional[int] = None,
):
    return func(
        struct({}),
        out,
        mat,
        rate_calls=rate_calls,
        rate_weight=rate_weight,
    )
