# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import (
    TypeInteger,
    TypeStruct,
    TypeFunc,
    TypeRefId,
)
from typegraph.gen.types import Err
from typing import Optional, Dict
from typegraph.graph.typegraph import core, store


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id

    def __repr__(self):
        res = core.get_type_repr(store, TypeRefId(self.id))
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None

    def __init__(self, *, min: Optional[int] = None, max: Optional[int] = None):
        data = TypeInteger(min=min, max=max)
        res = core.integerb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(self, props: Dict[str, typedef]):
        data = TypeStruct(
            props=list((name, TypeRefId(tpe.id)) for (name, tpe) in props.items())
        )

        res = core.structb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.props = props


class func(typedef):
    inp: struct
    out: typedef

    def __init__(self, inp: struct, out: typedef):
        data = TypeFunc(inp=TypeRefId(inp.id), out=TypeRefId(out.id))
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value
        super().__init__(id)
        self.inp = inp
        self.out = out
