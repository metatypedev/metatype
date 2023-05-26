# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import Core
from typegraph.gen.types import Err
from wasmtime import Store
from typegraph.gen import TypegraphCore
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from typegraph import t

store = Store()
core = Core(TypegraphCore(store))


class TypeGraph:
    name: str
    _context: List["TypeGraph"] = []

    def __init__(self, name: str):
        self.name = name

    def __enter__(self):
        self._context.append(self)
        core.init_typegraph(store, self.name)
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        tg = self._context.pop()
        assert tg == self
        res = core.finalize_typegraph(store)
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
        res = core.expose(store, lst, [])
        if isinstance(res, Err):
            raise Exception(res.value)
