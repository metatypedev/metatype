# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import List, Optional

from typegraph import t
from typegraph.gen.runtimes import (
    BaseMaterializer,
    Effect,
    GraphqlRuntimeData,
    MaterializerGraphqlQuery,
)
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes


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
            GraphqlRuntimeData(endpoint=endpoint)
        )

        super().__init__(runtime_id)
        self.endpoint = endpoint

    def query(
        self, inp: "t.struct", out: "t.typedef", *, path: Optional[List[str]] = None
    ):
        mat_id = runtimes.graphql_query(
            BaseMaterializer(runtime=self.id, effect="read"),
            MaterializerGraphqlQuery(path=path),
        )

        return t.func(inp, out, QueryMat(mat_id, effect="read", path=path))

    def mutation(
        self,
        inp: "t.struct",
        out: "t.typedef",
        effect: Effect,
        *,
        path: Optional[List[str]] = None,
    ):
        mat_id = runtimes.graphql_mutation(
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerGraphqlQuery(path=path),
        )

        return t.func(inp, out, MutationMat(mat_id, effect=effect, path=path))
