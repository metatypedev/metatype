# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import inspect
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Callable, List, Optional, Union, Any

from typegraph.gen.exports.core import (
    SerializeParams,
    Rate,
    TypegraphInitParams,
)
from typegraph.gen.exports.core import (
    Cors as CoreCors,
)
from typegraph.gen.exports.utils import Auth
from typegraph.gen.types import Err
from typegraph.graph.params import Cors, RawAuth
from typegraph.graph.shared_types import FinalizationResult, TypegraphOutput
from typegraph.policy import Policy, PolicyPerEffect, PolicySpec, get_policy_chain
from typegraph.envs.cli import CLI_ENV
from typegraph.wit import ErrorStack, core, store, wit_utils
from typegraph.io import Log

if TYPE_CHECKING:
    from typegraph import t


# ExposeItem = Union["t.func", Dict[str, "ExposeItem"]]
ExposeItem = Union["t.func", "t.struct"]


class Typegraph:
    name: str
    dynamic: Optional[bool]
    path: str
    _context: List["Typegraph"] = []
    rate: Optional[Rate]
    cors: Optional[CoreCors]
    prefix: Optional[str]

    def __init__(
        self,
        name: str,
        dynamic: Optional[bool] = None,
        *,
        rate: Optional[Rate] = None,
        cors: Optional[Cors] = None,
        prefix: Optional[str] = None,
    ):
        self.name = name
        self.dynamic = dynamic
        self.path = str(Path(inspect.stack()[2].filename).resolve())

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
            raise ErrorStack("No active typegraph")
        return cls._context[-1]

    def __call__(self, **kwargs: ExposeItem):
        self.expose(**kwargs)

    def expose(
        self,
        default_policy: Optional[PolicySpec] = None,
        **kwargs: ExposeItem,
    ):
        res = core.expose(
            store,
            [(k, v._id) for k, v in kwargs.items()],
            default_policy=get_policy_chain(default_policy) if default_policy else None,
        )

        if isinstance(res, Err):
            raise ErrorStack(res.value)


@dataclass
class ApplyFromArg:
    name: Optional[str]


@dataclass
class ApplyFromStatic:
    value: Any


@dataclass
class ApplyFromSecret:
    key: str


@dataclass
class ApplyFromContext:
    key: str


@dataclass
class ApplyFromParent:
    type_name: str


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

    def rest(self, graphql: str) -> int:
        res = wit_utils.add_graphql_endpoint(store, graphql)
        if isinstance(res, Err):
            raise ErrorStack(res.value)
        return res.value

    def auth(self, value: Union[Auth, RawAuth]):
        res = (
            wit_utils.add_raw_auth(store, value.json_str)
            if isinstance(value, RawAuth)
            else wit_utils.add_auth(store, value)
        )
        if isinstance(res, Err):
            raise ErrorStack(res.value)
        return res.value

    def ref(self, name: str) -> "t.typedef":
        return gen_ref(name)

    def configure_random_injection(self, seed: int):
        res = core.set_seed(store, seed)
        if isinstance(res, Err):
            raise ErrorStack(res.value)

    def as_arg(self, name: Optional[str] = None):
        return ApplyFromArg(name)

    def set(self, value: Any):
        return ApplyFromStatic(value)

    def from_secret(self, key: str):
        return ApplyFromSecret(key)

    def from_context(self, key: str):
        return ApplyFromContext(key)

    def from_parent(self, type_name: str):
        return ApplyFromParent(type_name)


def typegraph(
    name: Optional[str] = None,
    *,
    dynamic: Optional[bool] = None,
    rate: Optional[Rate] = None,
    cors: Optional[Cors] = None,
    prefix: Optional[str] = None,
) -> Callable[[Callable[[Graph], None]], TypegraphOutput]:
    def decorator(builder: Callable[[Graph], None]) -> TypegraphOutput:
        if name is None:
            import re

            # To kebab case
            actual_name = re.sub("_", "-", builder.__name__)
        else:
            actual_name = name

        if CLI_ENV is not None:
            filter = CLI_ENV.filter
            if filter is not None and actual_name not in filter:
                Log.debug("typegraph '{actual_name}' skipped")

                def serialize(params: SerializeParams):
                    raise Exception("typegraph was filtered out")

                return TypegraphOutput(name=actual_name, serialize=serialize)

        tg = Typegraph(
            name=actual_name,
            dynamic=dynamic,
            rate=rate,
            cors=cors,
            prefix=prefix,
        )

        Typegraph._context.append(tg)

        default_cors = CoreCors(
            allow_credentials=True,
            allow_headers=[],
            allow_methods=[],
            allow_origin=[],
            expose_headers=[],
            max_age_sec=None,
        )

        core.init_typegraph(
            store,
            TypegraphInitParams(
                name=tg.name,
                dynamic=tg.dynamic,
                path=tg.path,
                rate=tg.rate,
                cors=tg.cors or default_cors,
                prefix=tg.prefix,
            ),
        )

        try:
            builder(Graph(tg))
        except ErrorStack as e:
            import sys

            sys.stderr.write(f"Error in typegraph '{actual_name}':\n")
            for line in e.stack:
                sys.stderr.write("- ")
                sys.stderr.write(line)
                sys.stderr.write("\n")
            sys.exit(1)
        except Exception:
            raise

        popped = Typegraph._context.pop()
        assert tg == popped

        # config is only known at deploy time
        def serialize_with_artifacts(
            config: SerializeParams,
        ):
            finalization_result = core.serialize_typegraph(store, config)
            if isinstance(finalization_result, Err):
                raise ErrorStack(finalization_result.value)

            tg_json, ref_artifacts = finalization_result.value
            return FinalizationResult(tg_json, ref_artifacts)

        tg_output = TypegraphOutput(name=tg.name, serialize=serialize_with_artifacts)

        from typegraph.graph.tg_manage import Manager

        # run from meta/cli
        if CLI_ENV is not None:
            manager = Manager(tg_output)
            manager.run()

        return tg_output

    return decorator


def gen_ref(name: str) -> "t.typedef":
    res = core.refb(store, name, None)
    if isinstance(res, Err):
        raise ErrorStack(res.value)
    from typegraph.t import typedef

    return typedef(res.value)
