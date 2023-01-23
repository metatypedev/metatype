# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional
from typing import Tuple

from attrs import frozen
from typegraph import types as t
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.base import Runtime, Effect
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
        self, inp: t.struct, out: t.typedef, path: Optional[Tuple[str, ...]] = None, **kwargs
    ):
        if path is not None and len(path) == 0:
            raise Exception("Unexpected empty path")
        return t.func(inp, out, MutationMat(self, path, **kwargs))


@frozen
class QueryMat(Materializer):
    runtime: Runtime
    path: Optional[Tuple[str]]
    materializer_name: str = always("query")
    # effect = None


@frozen
class MutationMat(Materializer):
    runtime: Runtime
    path: Optional[Tuple[str]]
    materializer_name: str = always("mutation")
    effect: Optional[Effect] = required()
    idempotent: bool = required()
