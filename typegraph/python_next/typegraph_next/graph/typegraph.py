# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
import inspect
from pathlib import Path
from typing import TYPE_CHECKING, Callable, List, Optional, overload

from typegraph_next.gen.exports.core import TypegraphInitParams
from typegraph_next.gen.types import Err
from typegraph_next.wit import core, store

if TYPE_CHECKING:
    from typegraph_next import t


class Typegraph:
    name: str
    dynamic: Optional[bool]
    folder: Optional[str]
    path: str
    _context: List["Typegraph"] = []

    def __init__(
        self, name: str, dynamic: Optional[bool] = None, folder: Optional[str] = None
    ):
        self.name = name
        self.dynamic = dynamic
        self.folder = folder
        self.path = str(Path(inspect.stack()[1].filename).resolve().parent)

    @classmethod
    def get_active(cls) -> Optional["Typegraph"]:
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


@dataclass
class G:
    typegraph: Typegraph

    def expose(self, **kwargs: "t.func"):
        self.typegraph.expose(**kwargs)


def __build_typegraph(
    builder: Callable[[G], None],
    name: Optional[str],
    dynamic: Optional[bool] = None,
    folder: Optional[str] = None,
) -> Typegraph:
    if name is None:
        import re

        # To kebab case
        name = re.sub("_", "-", builder.__name__)

    tg = Typegraph(name, dynamic, folder)
    Typegraph._context.append(tg)
    core.init_typegraph(
        store,
        TypegraphInitParams(
            name=tg.name, dynamic=tg.dynamic, folder=tg.folder, path=tg.path
        ),
    )

    builder(G(tg))

    popped = Typegraph._context.pop()
    assert tg == popped

    res = core.finalize_typegraph(store)
    if isinstance(res, Err):
        raise Exception(res.value)

    print(res.value)

    return tg


@overload
def typegraph(builder: Callable[[G], None]) -> Typegraph:
    ...


@overload
def typegraph(
    name: str, dynamic: Optional[bool] = None, folder: Optional[str] = None
) -> Callable[[Callable[[G], None]], Typegraph]:
    ...


def typegraph(*largs, **kwargs) -> Callable[[Callable[[G], None]], Typegraph]:
    if len(largs) == 1 and len(kwargs) == 0 and callable(largs[0]):
        builder = largs[0]
        return __build_typegraph(builder, None)

    name: Optional[str] = None
    if len(largs) == 1:
        name = largs[0]
    elif len(largs) > 1:
        raise Exception("Too many arguments")

    if name is None:
        name = kwargs.get("name", None)

    dynamic: Optional[bool] = kwargs.get("dynamic", None)
    folder: Optional[str] = kwargs.get("folder", None)

    def decorator(builder: Callable[[G], None]) -> Typegraph:
        return __build_typegraph(builder, tg)

    return decorator
