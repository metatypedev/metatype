# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import (
    IntegerConstraints,
    StructConstraints,
    FuncConstraints,
)
from typegraph.gen.types import Err
from typing import Optional, Dict
from typegraph import TypeGraph


class typedef:
    id: int
    tg: TypeGraph

    def __init__(self, tg: TypeGraph, id: int):
        self.tg = tg
        self.id = id

    def __repr__(self):
        return self.tg.core.get_type_repr(self.tg.store, self.id)


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None

    def __init__(self, *, min: Optional[int] = None, max: Optional[int] = None):
        tg = TypeGraph.get_active()
        data = IntegerConstraints(min=min, max=max)
        super().__init__(tg, tg.core.integerb(tg.store, data).id)
        self.min = min
        self.max = max


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(self, props: Dict[str, typedef]):
        tg = TypeGraph.get_active()
        data = StructConstraints(
            props=list((name, tpe.id) for (name, tpe) in props.items())
        )

        super().__init__(tg, tg.core.structb(tg.store, data).id)
        self.props = props


class func(typedef):
    inp: struct
    out: typedef

    def __init__(self, inp: struct, out: typedef):
        tg = TypeGraph.get_active()
        data = FuncConstraints(inp=inp.id, out=out.id)
        res = tg.core.funcb(tg.store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value.id
        super().__init__(tg, id)
        self.inp = inp
        self.out = out
