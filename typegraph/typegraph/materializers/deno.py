import ast
from dataclasses import dataclass
from dataclasses import InitVar
from dataclasses import KW_ONLY
import inspect
import os
from typing import Optional

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime


@dataclass(eq=True, frozen=True)
class DenoRuntime(Runtime):
    _: KW_ONLY
    worker: str = "default"
    # permissions ...
    runtime_name: str = "deno"


class LambdaCollector(ast.NodeTransformer):
    @classmethod
    def collect(cls, function):
        source = inspect.getsource(function).lstrip()
        tree = ast.parse(source)
        ret = cls()
        ret.visit(tree)
        return ret.lambdas

    def __init__(self):
        super().__init__()
        self.lambdas = []

    def visit_Lambda(self, node):
        self.lambdas.append(ast.unparse(node).strip())


# Inlined fuction
@dataclass(eq=True, frozen=True)
class FunMat(Materializer):
    fn_expr: str  # function expression
    _: KW_ONLY
    runtime: DenoRuntime = DenoRuntime()
    materializer_name: str = "function"

    @classmethod
    def from_lambda(cls, function, runtime=DenoRuntime()):
        from metapensiero.pj.__main__ import transform_string

        lambdas = LambdaCollector.collect(function)
        assert len(lambdas) == 1
        code = transform_string(lambdas[0]).rstrip().rstrip(";")
        return FunMat(code, runtime=runtime)


@dataclass(eq=True, frozen=True)
class PredefinedFunMat(Materializer):
    name: str
    _: KW_ONLY
    runtime: DenoRuntime = DenoRuntime()
    materializer_name: str = "predefined_function"


# Import function from a module
@dataclass(eq=True, frozen=True)
class ImportFunMat(Materializer):
    mod: "ModuleMat"
    name: str = "default"
    _: KW_ONLY
    runtime: DenoRuntime = DenoRuntime()  # should be the same runtime as `mod`'s
    materializer_name: str = "import_function"


@dataclass(eq=True, frozen=True)
class ModuleMat(Materializer):
    file: InitVar[str] = None
    _: KW_ONLY
    code: Optional[str] = None
    runtime: Runtime = DenoRuntime()  # DenoRuntime
    materializer_name: str = "module"

    def __post_init__(self, file: Optional[str]):
        if file is None:
            if self.code is None:
                raise Exception("you must give source code for the module")
        else:
            if self.code is not None:
                raise Exception("you must only give either source file or source code")

            from typegraph.graphs.typegraph import get_absolute_path

            path = get_absolute_path(file)
            if os.environ["DONT_READ_EXTERNAL_TS_FILES"]:
                object.__setattr__(self, "code", f"file:{path}")
            else:
                with open(path) as f:
                    object.__setattr__(self, "code", f.read())

    def imp(self, name: str = "default") -> FunMat:
        return ImportFunMat(self, name, runtime=self.runtime)


@dataclass(eq=True, frozen=True)
class IdentityMat(PredefinedFunMat):
    name: str = "identity"


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


@dataclass(eq=True, frozen=True)
class TypeNodeMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "typenode"


@dataclass(eq=True, frozen=True)
class TypesAsGraph(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "typesAsGraph"


@dataclass(eq=True, frozen=True)
class SerializedTypegraphMat(Materializer):
    runtime: Runtime = TypeGateRuntime()
    materializer_name: str = "serializedTypegraph"
