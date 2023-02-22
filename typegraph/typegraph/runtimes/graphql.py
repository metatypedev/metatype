# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional, Tuple

from attrs import frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


@frozen
class GraphQLRuntime(Runtime):
    endpoint: str
    runtime_name: str = always("graphql")

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
