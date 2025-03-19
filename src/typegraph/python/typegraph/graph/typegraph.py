# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import inspect
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING, Callable, List, Optional, Union, Any

from typegraph.gen.core import (
    SerializeParams,
    Rate,
    TypegraphInitParams,
)
from typegraph.gen.core import Cors as CoreCors, Rate as CoreRate
from typegraph.gen.utils import Auth
from typegraph.graph.params import Cors, RawAuth
from typegraph.graph.shared_types import FinalizationResult, TypegraphOutput
from typegraph.policy import Policy, PolicyPerEffect, PolicySpec, get_policy_chain
from typegraph.envs.cli import CLI_ENV
from typegraph.sdk import core, sdk_utils
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
    rate: Optional[CoreRate]
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

        self.rate = Rate(**rate.__dict__) if rate else None

        cors = cors or Cors()
        self.cors = CoreCors(**cors.__dict__)
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
            [(k, v._id) for k, v in kwargs.items()],
            default_policy=get_policy_chain(default_policy) if default_policy else None,
        )


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
        return sdk_utils.add_graphql_endpoint(graphql)

    def auth(self, value: Union[Auth, RawAuth]):
        if isinstance(value, RawAuth):
            return sdk_utils.add_raw_auth(value.json_str)
        else:
            return sdk_utils.add_auth(value)

    def ref(self, name: str) -> "t.typedef":
        return gen_ref(name)

    def configure_random_injection(self, seed: int):
        core.set_seed(seed)

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
        except Exception as e:
            import sys

            sys.stderr.write(f"Error in typegraph '{actual_name}':\n")
            sys.stderr.write(str(e))
            sys.exit(1)

        popped = Typegraph._context.pop()
        assert tg == popped

        # config is only known at deploy time
        def serialize_with_artifacts(
            config: SerializeParams,
        ):
            finalization_result = core.serialize_typegraph(config)
            tg_json, ref_artifacts = finalization_result
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
    res = core.refb(name, None)

    from typegraph.t import typedef

    return typedef(res)
