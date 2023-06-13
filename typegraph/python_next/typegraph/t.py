# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import (
    TypeInteger,
    TypeStruct,
    TypeFunc,
    TypeBase,
    TypeProxy,
)
from typegraph.gen.types import Err
from typing import Optional, Dict
from typegraph.graph.typegraph import core, store


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id

    def __repr__(self):
        res = core.get_type_repr(store, self.id)
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value


class ref(typedef):
    name: str

    def __init__(self, name: str):
        res = core.proxyb(store, TypeProxy(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.name = name


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        name: Optional[str] = None
    ):
        data = TypeInteger(min=min, max=max)
        res = core.integerb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max


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

    def __init__(self, inp: struct, out: typedef):
        data = TypeFunc(inp=inp.id, out=out.id)
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value
        super().__init__(id)
        self.inp = inp
        self.out = out
