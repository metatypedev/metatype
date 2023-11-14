# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import List, Optional

from typegraph import t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    EffectRead,
    GraphqlRuntimeData,
    MaterializerGraphqlQuery,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


@dataclass
class QueryMat(Materializer):
    path: List[str]


@dataclass
class MutationMat(Materializer):
    path: List[str]


class GraphQLRuntime(Runtime):
    endpoint: str

    def __init__(self, endpoint: str):
        runtime_id = runtimes.register_graphql_runtime(
            store, GraphqlRuntimeData(endpoint=endpoint)
        )
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)
        self.endpoint = endpoint

    def query(
        self, inp: "t.struct", out: "t.typedef", *, path: Optional[List[str]] = None
    ):
        mat_id = runtimes.graphql_query(
            store,
            BaseMaterializer(runtime=self.id, effect=EffectRead()),
            MaterializerGraphqlQuery(path=path),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(inp, out, QueryMat(mat_id.value, effect=EffectRead(), path=path))

    def mutation(
        self,
        inp: "t.struct",
        out: "t.typedef",
        effect: Effect,
        *,
        path: Optional[List[str]] = None,
    ):
        mat_id = runtimes.graphql_mutation(
            store,
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerGraphqlQuery(path=path),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(inp, out, MutationMat(mat_id.value, effect=effect, path=path))
