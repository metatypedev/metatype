# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import (
    IntegerConstraints,
    StructConstraints,
    FuncConstraints,
)
from typegraph.gen.types import Err
from typing import Optional, Dict
from typegraph.graph.typegraph import TypeGraph, core, store


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id

    def __repr__(self):
        return core.get_type_repr(store, self.id)


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None

    def __init__(self, *, min: Optional[int] = None, max: Optional[int] = None):
        data = IntegerConstraints(min=min, max=max)
        super().__init__(core.integerb(store, data).id)
        self.min = min
        self.max = max


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(self, props: Dict[str, typedef]):
        data = StructConstraints(
            props=list((name, tpe.id) for (name, tpe) in props.items())
        )

        res = core.structb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value.id)
        self.props = props


class func(typedef):
    inp: struct
    out: typedef

    def __init__(self, inp: struct, out: typedef):
        data = FuncConstraints(inp=inp.id, out=out.id)
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value.id
        super().__init__(id)
        self.inp = inp
        self.out = out
