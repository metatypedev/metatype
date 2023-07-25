# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import inspect
from pathlib import Path
from typing import TYPE_CHECKING, List, Optional

from typegraph_next.gen.exports.core import TypegraphInitParams
from typegraph_next.gen.types import Err
from typegraph_next.wit import core, store

if TYPE_CHECKING:
    from typegraph_next import t


class typegraph:
    name: str
    dynamic: Optional[bool]
    folder: Optional[str]
    path: str
    _context: List["typegraph"] = []

    def __init__(
        self, name: str, dynamic: Optional[bool] = None, folder: Optional[str] = None
    ):
        self.name = name
        self.dynamic = dynamic
        self.folder = folder
        self.path = str(Path(inspect.stack()[1].filename).resolve().parent)

    def __enter__(self):
        self._context.append(self)
        core.init_typegraph(
            store,
            TypegraphInitParams(
                name=self.name, dynamic=self.dynamic, folder=self.folder, path=self.path
            ),
        )
        return self

    def __exit__(self, exc_type, exc_value, exc_tb):
        tg = self._context.pop()
        assert tg == self
        res = core.finalize_typegraph(store)
        if isinstance(res, Err):
            raise Exception(res.value)
        print(res.value)

    @classmethod
    def get_active(cls) -> Optional["typegraph"]:
        if len(cls._context) == 0:
            raise Exception("No active typegraph")
        return cls._context[-1]

    def __call__(self, **kwargs: "t.func"):
        self.expose(**kwargs)

    def expose(self, **kwargs: "t.func"):
        lst = list((name, fn.id) for (name, fn) in kwargs.items())
        res = core.expose(store, lst, [])
        if isinstance(res, Err):
            raise Exception(res.value)
