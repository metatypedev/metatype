# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Optional, Tuple

from attrs import frozen, field

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


@frozen
class GraphQLRuntime(Runtime):
    """
    [Documentation](https://metatype.dev/docs/reference/runtimes/graphql)
    """

    endpoint: str
    runtime_name: str = field(default="graphql", init=False)

    def query(
        self, inp: t.struct, out: t.typedef, *, path: Optional[Tuple[str, ...]] = None
    ):
        if path is not None and len(path) == 0:
            raise Exception("Unexpected empty path")
        return t.func(inp, out, QueryMat(self, path))

    def mutation(
        self,
        inp: t.struct,
        out: t.typedef,
        path: Optional[Tuple[str, ...]] = None,
        **kwargs
    ):
        if path is not None and len(path) == 0:
            raise Exception("Unexpected empty path")
        return t.func(inp, out, MutationMat(self, path, **kwargs))


@frozen
class QueryMat(Materializer):
    runtime: Runtime
    path: Optional[Tuple[str]]
    materializer_name: str = always("query")
    effect: Effect = always(effects.none())


@frozen
class MutationMat(Materializer):
    runtime: Runtime
    path: Optional[Tuple[str]]
    materializer_name: str = always("mutation")
    effect: Effect = required()
