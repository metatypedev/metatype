# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import Core
from typegraph.gen import TypegraphCore
from typing import Optional
from wasmtime import Store


store = Store()
core = Core(TypegraphCore(store))


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id


class integer(typedef):
    def __init__(self, id: Optional[int] = None):
        super().__init__(core.integerb(store).id)

    def min(self, n: int) -> "integer":
        return integer(core.integermin(store, self.id, n))

    def __str__(self):
        return f"integer#{self.id}()"

    def __getattr__(self, name: str):
        return core.gettpe(store, self.id, name)


a = integer()
b = integer()

print(a)
print(b)
print(a.min(1))
print(a._min)
print(a.min(2)._min)
