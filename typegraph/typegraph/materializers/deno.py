# Copyright Metatype under the Elastic License 2.0.

import ast
from dataclasses import dataclass
from dataclasses import field
from dataclasses import InitVar
from dataclasses import KW_ONLY
import inspect
import os
from typing import Any
from typing import Dict
from typing import Optional
from typing import Tuple

from frozendict import frozendict
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime


@dataclass(eq=True, frozen=True)
class DenoRuntime(Runtime):
    _: KW_ONLY
    worker: str = "default"
    net: InitVar[Tuple[str, ...]] = tuple()
    permissions: Dict[str, Any] = field(default_factory=frozendict)
    runtime_name: str = "deno"

    def __post_init__(self, net: Optional[Tuple[str, ...]]):
        permissions = {}
        if net is not None and len(net) > 0:
            if "*" in net:
                permissions["net"] = True
            else:
                permissions["net"] = net

        if len(permissions) > 0:
            object.__setattr__(self, "permissions", frozendict(permissions))


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
    fn_expr: InitVar[str] = None
    _: KW_ONLY
    # a script that assigns a function expression into the variable _my_lambda
    script: Optional[str] = None
    runtime: DenoRuntime = DenoRuntime()
    materializer_name: str = "function"

    @classmethod
    def from_lambda(cls, function, runtime=DenoRuntime()):
        from metapensiero.pj.__main__ import transform_string

        lambdas = LambdaCollector.collect(function)
        assert len(lambdas) == 1
        code = transform_string(f"_my_lambda = {lambdas[0]}").rstrip()
        return FunMat(script=code, runtime=runtime)

    def __post_init__(self, fn_expr: Optional[str]):
        if fn_expr is None:
            if self.script is None:
                raise Exception("you must give the script or a function expression")
        else:
            if self.script is not None:
                raise Exception(
                    "you must only give either the script or a function expression"
                )
            object.__setattr__(self, "script", f"var _my_lambda = {fn_expr};")


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
