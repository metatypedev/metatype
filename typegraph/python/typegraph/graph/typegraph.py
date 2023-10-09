# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import inspect
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Callable, List, Optional, Union

from typegraph.gen.exports.core import (
    Auth,
    Rate,
    TypegraphInitParams,
)
from typegraph.gen.exports.core import (
    Cors as CoreCors,
)
from typegraph.gen.types import Err
from typegraph.graph.params import Cors
from typegraph.policy import Policy, PolicyPerEffect, PolicySpec, get_policy_chain
from typegraph.wit import core, store, wit_utils

if TYPE_CHECKING:
    from typegraph import t


typegraph_version = "0.0.2"

# ExposeItem = Union["t.func", Dict[str, "ExposeItem"]]
ExposeItem = Union["t.func", "t.struct"]


class Typegraph:
    name: str
    dynamic: Optional[bool]
    path: str
    _context: List["Typegraph"] = []
    auths: Optional[List[Auth]]
    rate: Optional[Rate]
    cors: Optional[CoreCors]
    prefix: Optional[str]

    def __init__(
        self,
        name: str,
        dynamic: Optional[bool] = None,
        *,
        auths: Optional[List[Auth]] = None,
        rate: Optional[Rate] = None,
        cors: Optional[Cors] = None,
        prefix: Optional[str] = None,
    ):
        self.name = name
        self.dynamic = dynamic
        self.path = str(Path(inspect.stack()[2].filename).resolve().parent)

        self.auths = auths or []
        self.rate = rate

        cors = cors or Cors()
        self.cors = CoreCors(
            allow_origin=cors.allow_origin,
            allow_headers=cors.allow_headers,
            expose_headers=cors.expose_headers,
            allow_methods=cors.allow_methods,
            allow_credentials=cors.allow_credentials,
            max_age_sec=cors.max_age_sec,
        )
        self.prefix = prefix

    @classmethod
    def get_active(cls) -> Optional["Typegraph"]:
        if len(cls._context) == 0:
            raise Exception("No active typegraph")
        return cls._context[-1]

    def __call__(self, **kwargs: ExposeItem):
        self.expose(**kwargs)

    def expose(
        self,
        default_policy: Optional[PolicySpec] = None,
        **kwargs: ExposeItem,
    ):
        core.expose(
            store,
            [(k, v.id) for k, v in kwargs.items()],
            default_policy=get_policy_chain(default_policy) if default_policy else None,
        )


@dataclass
class Graph:
    typegraph: Typegraph

    def expose(
        self,
        default_policy: Optional[Union[Policy, PolicyPerEffect]] = None,
        **kwargs: ExposeItem,
    ):
        self.typegraph.expose(default_policy, **kwargs)

    def inherit(self):
        from typegraph.injection import InheritDef

        return InheritDef()

    def rest(graphql: str) -> int:
        res = wit_utils.add_graphql_endpoint(graphql)
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value


def typegraph(
    name: Optional[str] = None,
    *,
    dynamic: Optional[bool] = None,
    auths: Optional[List[Auth]] = None,
    rate: Optional[Rate] = None,
    cors: Optional[Cors] = None,
    prefix: Optional[str] = None,
) -> Callable[[Callable[[Graph], None]], Typegraph]:
    def decorator(builder: Callable[[Graph], None]) -> Typegraph:
        actual_name = name
        if name is None:
            import re

            # To kebab case
            actual_name = re.sub("_", "-", builder.__name__)

        tg = Typegraph(
            name=actual_name,
            dynamic=dynamic,
            auths=auths,
            rate=rate,
            cors=cors,
            prefix=prefix,
        )

        Typegraph._context.append(tg)

        core.init_typegraph(
            store,
            TypegraphInitParams(
                name=tg.name,
                dynamic=tg.dynamic,
                path=tg.path,
                auths=tg.auths,
                rate=tg.rate,
                cors=tg.cors,
                prefix=tg.prefix,
            ),
        )

        builder(Graph(tg))

        popped = Typegraph._context.pop()
        assert tg == popped

        res = core.finalize_typegraph(store)
        if isinstance(res, Err):
            raise Exception(res.value)

        print(res.value)

        return tg

    return decorator
