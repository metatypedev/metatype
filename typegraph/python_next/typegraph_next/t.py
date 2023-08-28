# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from typing import Dict, List, Optional, Tuple, Union
from typegraph_next.utils import serialize_record_values, serialize_injection

from typing_extensions import Self

from typegraph_next.gen.exports.core import (
    PolicyPerEffect as WitPolicyPerEffect,
)
from typegraph_next.gen.exports.core import (
    PolicySpecPerEffect,
    PolicySpecSimple,
    TypeBase,
    TypeFunc,
    TypeInteger,
    TypeFloat,
    TypeArray,
    TypeEither,
    TypeUnion,
    TypeOptional,
    TypeString,
    TypePolicy,
    TypeProxy,
    TypeStruct,
)
from typegraph_next.gen.types import Err
from typegraph_next.graph.typegraph import core, store
from typegraph_next.policy import Policy, PolicyPerEffect
from typegraph_next.runtimes.deno import Materializer
from typegraph_next.effects import EffectType


class typedef:
    id: int
    runtime_config: Optional[List[Tuple[str, str]]]

    def __init__(self, id: int):
        self.id = id
        self.runtime_config = None

    def __repr__(self):
        res = core.get_type_repr(store, self.id)
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value

    def with_policy(self, *policies: Union[Policy, PolicyPerEffect]) -> Self:
        res = core.with_policy(
            store,
            TypePolicy(
                tpe=self.id,
                chain=[
                    PolicySpecSimple(value=p.id)
                    if isinstance(p, Policy)
                    else PolicySpecPerEffect(
                        value=WitPolicyPerEffect(
                            create=p.create and p.create.id,
                            update=p.update and p.update.id,
                            delete=p.delete and p.delete.id,
                            none=p.none and p.none.id,
                        )
                    )
                    for p in policies
                ],
            ),
        )

        if isinstance(res, Err):
            raise Exception(res.value)

        return _TypeWithPolicy(res.value, self, policies)

    def optional(self, default_value: Optional[str] = None) -> "optional":
        if isinstance(self, optional):
            return self
        return optional(self, default_item=default_value)

    def set(self, value: Union[any, Dict[EffectType, any]]):
        core.update_type_injection(
            store,
            self.id,
            serialize_injection(
                "static", value=value, value_mapper=lambda x: json.dumps(x)
            ),
        )
        return self

    def inject(self, value: Union[any, Dict[EffectType, any]]):
        core.update_type_injection(
            store, self.id, serialize_injection("dynamic", value=value)
        )
        return self

    def from_context(self, value: Union[str, Dict[EffectType, str]]):
        core.update_type_injection(
            store, self.id, serialize_injection("context", value=value)
        )
        return self

    def from_secret(self, value: Union[str, Dict[EffectType, str]]):
        core.update_type_injection(
            store, self.id, serialize_injection("secret", value=value)
        )
        return self

    def from_parent(self, value: Union[str, Dict[EffectType, str]]):
        correct_value = None
        if isinstance(value, str):
            correct_value = proxy(value).id
        else:
            if isinstance(value, dict):
                if len(value) > 0 and all(
                    isinstance(k, EffectType) for k in value.keys()
                ):
                    correct_value = {}
                    for k, v in value.items():
                        if not isinstance(v, str):
                            raise Exception(
                                f"value for field {k.name} must be a string"
                            )
                        correct_value[k] = proxy(v).id
                else:
                    raise Exception("props should be of type EffectType")
            else:
                raise Exception("type not supported")

        assert correct_value is not None

        core.update_type_injection(
            store,
            self.id,
            serialize_injection(
                "parent", value=correct_value, value_mapper=lambda x: x
            ),
        )
        return self


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


class ref(typedef):
    name: str

    def __init__(self, name: str):
        res = core.proxyb(store, TypeProxy(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.name = name


class proxy(ref):
    pass


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None
    exclusive_minimum: Optional[int] = None
    exclusive_maximum: Optional[int] = None
    multiple_of: Optional[int] = None
    enumeration: Optional[List[int]] = (None,)

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        exclusive_minimum: Optional[int] = None,
        exclusive_maximum: Optional[int] = None,
        multiple_of: Optional[int] = None,
        enumeration: Optional[List[int]] = None,
        name: Optional[str] = None,
        config: Optional[Dict[str, any]] = None,
    ):
        data = TypeInteger(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
            enumeration=enumeration,
        )
        runtime_config = serialize_record_values(config)
        res = core.integerb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of
        self.enumeration = enumeration
        self.runtime_config = runtime_config


class float(typedef):
    min: Optional[float] = None
    max: Optional[float] = None
    exclusive_minimum: Optional[float] = None
    exclusive_maximum: Optional[float] = None
    multiple_of: Optional[float] = None
    enumeration: Optional[List[float]] = (None,)

    def __init__(
        self,
        *,
        min: Optional[float] = None,
        max: Optional[float] = None,
        exclusive_minimum: Optional[float] = None,
        exclusive_maximum: Optional[float] = None,
        multiple_of: Optional[float] = None,
        enumeration: Optional[List[float]] = None,
        name: Optional[str] = None,
        config: Optional[Dict[str, any]] = None,
    ):
        data = TypeFloat(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
            enumeration=enumeration,
        )
        runtime_config = serialize_record_values(config)
        res = core.floatb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of
        self.enumeration = enumeration
        self.runtime_config = runtime_config


class boolean(typedef):
    def __init__(
        self, *, name: Optional[str] = None, config: Optional[Dict[str, any]] = None
    ):
        runtime_config = serialize_record_values(config)
        res = core.booleanb(
            store, TypeBase(name=name, runtime_config=runtime_config, injection=None)
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

    def __init__(
        self,
        *,
        min: Optional[float] = None,
        max: Optional[float] = None,
        pattern: Optional[str] = None,
        format: Optional[str] = None,
        enumeration: Optional[List[str]] = None,
        name: Optional[str] = None,
        config: Optional[Dict[str, any]] = None,
    ):
        enum_variants = None
        if enumeration is not None:
            enum_variants = list(json.dumps(variant) for variant in enumeration)

        data = TypeString(
            min=min, max=max, pattern=pattern, format=format, enumeration=enum_variants
        )

        runtime_config = serialize_record_values(config)
        res = core.stringb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.pattern = pattern
        self.format = format
        self.enumeration = enumeration
        self.runtime_config = runtime_config


def uuid() -> string:
    return string(format="uuid")


def email() -> string:
    return string(format="email")


def uri() -> string:
    return string(format="uri")


def ean() -> string:
    return string(format="ean")


def path() -> string:
    return string(format="path")


def enum(
    variants: List[str],
    name: Optional[str] = None,
):
    return string(enumeration=variants, name=name)


class array(typedef):
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
        config: Optional[Dict[str, any]] = None,
    ):
        data = TypeArray(
            of=items.id,
            min=min,
            max=max,
            unique_items=unique_items,
        )

        runtime_config = serialize_record_values(config)
        res = core.arrayb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
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
        default_item: Optional[str] = None,
        name: Optional[str] = None,
        config: Optional[Dict[str, str]] = None,
    ):
        data = TypeOptional(
            of=item.id,
            default_item=default_item,
        )

        runtime_config = serialize_record_values(config)
        res = core.optionalb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
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
        config: Optional[Dict[str, str]] = None,
    ):
        data = TypeUnion(variants=list(map(lambda v: v.id, variants)))

        runtime_config = serialize_record_values(config)
        res = core.unionb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
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
        config: Optional[Dict[str, str]] = None,
    ):
        data = TypeEither(variants=list(map(lambda v: v.id, variants)))

        runtime_config = serialize_record_values(config)
        res = core.eitherb(
            store,
            data,
            TypeBase(name=name, runtime_config=runtime_config, injection=None),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.variants = variants
        self.runtime_config = runtime_config


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(
        self,
        props: Dict[str, typedef],
        *,
        name: Optional[str] = None,
        config: Optional[Dict[str, str]] = None,
    ):
        data = TypeStruct(props=list((name, tpe.id) for (name, tpe) in props.items()))

        runtime_config = serialize_record_values(config)
        res = core.structb(
            store,
            data,
            base=TypeBase(name=name, runtime_config=runtime_config, injection=None),
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.props = props
        self.runtime_config = runtime_config


class func(typedef):
    inp: struct
    out: typedef
    mat: Materializer

    def __init__(self, inp: struct, out: typedef, mat: Materializer):
        data = TypeFunc(inp=inp.id, out=out.id, mat=mat.id)
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value
        super().__init__(id)
        self.inp = inp
        self.out = out
