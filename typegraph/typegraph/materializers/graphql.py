from dataclasses import dataclass
from dataclasses import KW_ONLY

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t


@dataclass(eq=True, frozen=True)
class GraphQLRuntime(Runtime):
    endpoint: str
    _: KW_ONLY
    runtime_name: str = "graphql"

    def query(self, inp, out):
        return t.func(inp, out, QueryMat(self))

    def mutation(self, inp, out):
        return t.func(inp, out, MutationMat(self, serial=True))


@dataclass(eq=True, frozen=True)
class QueryMat(Materializer):
    runtime: Runtime
    _: KW_ONLY
    materializer_name: str = "query"


@dataclass(eq=True, frozen=True)
class MutationMat(Materializer):
    runtime: Runtime
    _: KW_ONLY
    materializer_name: str = "mutation"
