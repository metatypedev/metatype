# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import Core, IntegerConstraints, StructConstraints
from typegraph.gen import TypegraphCore
from typing import Optional, Dict
from wasmtime import Store


def my_print(s: str):
    print(s)


store = Store()
core = Core(TypegraphCore(store))


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

        super().__init__(core.structb(store, data).id)
        self.props = props


a = integer()
b = integer(min=12)
c = integer(min=12, max=43)

print(a)
print(b)
print(c)
print(c.min, c.max)

s1 = struct(
    {
        "a": a,
        "b": integer(),
    }
)

print(s1)
