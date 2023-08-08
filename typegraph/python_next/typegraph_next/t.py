# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Dict, List, Optional, Tuple, Union

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
    TypeNumber,
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


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id

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

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        exclusive_minimum: Optional[int] = None,
        exclusive_maximum: Optional[int] = None,
        multiple_of: Optional[int] = None,
        name: Optional[str] = None,
    ):
        data = TypeInteger(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
        )

        res = core.integerb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of


class number(typedef):
    min: Optional[float] = None
    max: Optional[float] = None
    exclusive_minimum: Optional[float] = None
    exclusive_maximum: Optional[float] = None
    multiple_of: Optional[float] = None

    def __init__(
        self,
        *,
        min: Optional[float] = None,
        max: Optional[float] = None,
        exclusive_minimum: Optional[float] = None,
        exclusive_maximum: Optional[float] = None,
        multiple_of: Optional[float] = None,
        name: Optional[str] = None,
    ):
        data = TypeNumber(
            min=min,
            max=max,
            exclusive_minimum=exclusive_minimum,
            exclusive_maximum=exclusive_maximum,
            multiple_of=multiple_of,
        )

        res = core.numberb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.exclusive_minimum = exclusive_minimum
        self.exclusive_maximum = exclusive_maximum
        self.multiple_of = multiple_of


class float(number):
    pass


class boolean(typedef):
    def __init__(
        self,
        *,
        name: Optional[float] = None,
    ):
        res = core.booleanb(store, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)


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
    ):
        data = TypeString(
            min=min, max=max, pattern=pattern, format=format, enumeration=enumeration
        )

        res = core.stringb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.pattern = pattern
        self.format = format
        self.enumeration = enumeration


def enum(
    variants: List[str],
    name: Optional[str] = None,
):
    import json

    return string(
        enumeration=list(json.dumps(variant) for variant in variants), name=name
    )


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
    ):
        data = TypeArray(
            of=items.id,
            min=min,
            max=max,
            unique_items=unique_items,
        )

        res = core.arrayb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max
        self.items = items
        self.unique_items = unique_items


class optional(typedef):
    item: Optional[typedef] = None
    default_item: Optional[str] = None

    def __init__(
        self,
        item: typedef,
        default_item: Optional[str] = None,
        name: Optional[str] = None,
    ):
        data = TypeOptional(
            of=item.id,
            default_item=default_item,
        )

        res = core.optionalb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.item = item
        self.default_item = default_item


class union(typedef):
    variants: List[typedef] = []

    def __init__(
        self,
        variants: List[typedef],
        name: Optional[float] = None,
    ):
        data = TypeUnion(variants=list(map(lambda v: v.id, variants)))

        res = core.unionb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.variants = variants


class either(typedef):
    variants: List[typedef] = []

    def __init__(
        self,
        variants: List[typedef],
        name: Optional[float] = None,
    ):
        data = TypeEither(variants=list(map(lambda v: v.id, variants)))

        res = core.eitherb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.variants = variants


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(self, props: Dict[str, typedef], *, name: Optional[str] = None):
        data = TypeStruct(props=list((name, tpe.id) for (name, tpe) in props.items()))

        res = core.structb(store, data, base=TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.props = props


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
