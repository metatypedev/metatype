# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import Core
from typegraph.gen.types import Err
from wasmtime import Store
from typegraph.gen import TypegraphCore
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from typegraph import t


class TypeGraph:
    name: str
    store: Store
    core: Core
    _context: List["TypeGraph"] = []

    def __init__(self, name: str):
        self.name = name
        self.store = Store()
        self.core = Core(TypegraphCore(self.store))

    def __enter__(self):
        self._context.append(self)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        tg = self._context.pop()
        assert tg == self
        res = self.core.serialize(self.store)
        if isinstance(res, Err):
            raise Exception(res.value)
        print(res.value)

    @classmethod
    def get_active(cls) -> Optional["TypeGraph"]:
        if len(cls._context) == 0:
            raise Exception("No active typegraph")
        return cls._context[-1]

    def expose(self, **kwargs: "t.func"):
        lst = list((name, fn.id) for (name, fn) in kwargs.items())
        res = self.core.expose(self.store, lst, [])
        if isinstance(res, Err):
            raise Exception(res.value)
