# Copyright Metatype under the Elastic License 2.0.

from attrs import frozen
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import types as t
from typegraph.utils.attrs import always


@frozen
class GraphQLRuntime(Runtime):
    endpoint: str
    runtime_name: str = always("graphql")

    def query(self, inp, out):
        return t.func(inp, out, QueryMat(self))

    def mutation(self, inp, out):
        return t.func(inp, out, MutationMat(self, serial=True))


@frozen
class QueryMat(Materializer):
    runtime: Runtime
    materializer_name: str = always("query")


@frozen
class MutationMat(Materializer):
    runtime: Runtime
    materializer_name: str = always("mutation")
