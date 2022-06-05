from dataclasses import dataclass
from dataclasses import KW_ONLY

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime


@dataclass(eq=True, frozen=True)
class DenoRuntime(Runtime):
    runtime_name: str = "deno"


@dataclass(eq=True, frozen=True)
class AutoMaterializer(Materializer):
    runtime: Runtime = DenoRuntime()
    materializer_name: str = "identity"


@dataclass(eq=True, frozen=True)
class IdentityMat(Materializer):
    runtime: Runtime = DenoRuntime()
    materializer_name: str = "identity"


@dataclass(eq=True, frozen=True)
class FunMat(Materializer):
    name: str
    _: KW_ONLY
    runtime: Runtime = DenoRuntime()
    materializer_name: str = "function"


@dataclass(eq=True, frozen=True)
class TypeGraphRuntime(Runtime):
    runtime_name: str = "typegraph"


@dataclass(eq=True, frozen=True)
class TypeMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = "getType"


@dataclass(eq=True, frozen=True)
class SchemaMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = "getSchema"


@dataclass(eq=True, frozen=True)
class ResolverMat(Materializer):
    runtime: Runtime = TypeGraphRuntime()
    materializer_name: str = "resolver"


@dataclass(eq=True, frozen=True)
class TypeGateRuntime(Runtime):
    runtime_name: str = "typegate"


@dataclass(eq=True, frozen=True)
class TypeGraphsMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "typegraphs"


@dataclass(eq=True, frozen=True)
class TypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "typegraph"


@dataclass(eq=True, frozen=True)
class AddTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "addTypegraph"


@dataclass(eq=True, frozen=True)
class RemoveTypeGraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "removeTypegraph"
