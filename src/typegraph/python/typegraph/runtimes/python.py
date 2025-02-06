# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
import ast
import inspect
from dataclasses import dataclass
from typing import TYPE_CHECKING, List, Optional, Union, overload

from astunparse import unparse
from typegraph.gen.runtimes import (
    BaseMaterializer,
    Effect,
    MaterializerPythonDef,
    MaterializerPythonImport,
    MaterializerPythonLambda,
    MaterializerPythonModule,
)
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes
from typegraph.utils import Module, ResolvedModule, resolve_module_params

if TYPE_CHECKING:
    from typegraph import t


PythonModule = Module


class PythonRuntime(Runtime):
    def __init__(self):
        super().__init__(runtimes.register_python_runtime())

    def from_lambda(
        self,
        inp: "t.struct",
        out: "t.typedef",
        function: callable,
        *,
        effect: Effect = "read",
        # secrets: Optional[List[str]] = None,
    ):
        lambdas, _defs = DefinitionCollector.collect(function)
        assert len(lambdas) == 1
        fn = str(lambdas[0])
        if fn.startswith("(") and fn.endswith(")"):
            fn = fn[1:-1]
        mat_id = runtimes.from_python_lambda(
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerPythonLambda(runtime=self.id, function=fn),
        )

        from typegraph import t

        return t.func(
            inp,
            out,
            LambdaMat(id=mat_id, fn=fn, effect=effect),
        )

    def from_def(
        self,
        inp: "t.struct",
        out: "t.typedef",
        function: callable,
        *,
        effect: Effect = "read",
    ):
        _lambdas, defs = DefinitionCollector.collect(function)
        assert len(defs) == 1
        name, fn = defs[0]

        mat_id = runtimes.from_python_def(
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerPythonDef(runtime=self.id, name=name, function=fn),
        )

        from typegraph import t

        return t.func(
            inp,
            out,
            DefMat(id=mat_id, name=name, fn=fn, effect=effect),
        )

    @overload
    def import_(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        module: str,
        name: str,
        deps: List[str],
        effect: Optional[Effect],
        secrets: Optional[List[str]],
    ): ...

    @overload
    def import_(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        module: ResolvedModule,
        secrets: Optional[List[str]],
    ): ...

    def import_(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        module: Union[str, ResolvedModule],
        name: Optional[str] = None,
        deps: Optional[List[str]] = None,
        effect: Optional[Effect] = None,
        secrets: Optional[List[str]] = None,
    ):
        effect = effect or "read"
        secrets = secrets or []
        resolved = resolve_module_params(module, name, deps)

        base = BaseMaterializer(runtime=self.id, effect=effect)
        mat_id = runtimes.from_python_module(
            base,
            MaterializerPythonModule(
                file=resolved.module,
                deps=resolved.deps,
                runtime=self.id,
            ),
        )

        py_mod_mat_id = runtimes.from_python_import(
            base,
            MaterializerPythonImport(
                module=mat_id, func_name=resolved.func_name, secrets=secrets
            ),
        )

        from typegraph import t

        return t.func(
            inp,
            out,
            ImportMat(
                id=py_mod_mat_id,
                name=resolved.func_name,
                module=resolved.module,
                secrets=secrets,
                effect=effect,
            ),
        )


@dataclass
class LambdaMat(Materializer):
    fn: str
    effect: Effect


@dataclass
class DefMat(Materializer):
    fn: str
    name: str
    effect: Effect


@dataclass
class ImportMat(Materializer):
    module: str
    name: str
    secrets: List[str]


@dataclass
class WorkflowMat(Materializer):
    file: str
    name: str
    secrets: List[str]


class DefinitionCollector(ast.NodeTransformer):
    @classmethod
    def collect(cls, function):
        source = inspect.getsource(function).lstrip()
        tree = ast.parse(source)
        ret = cls()
        ret.visit(tree)
        return ret.lambdas, ret.defs

    def __init__(self):
        super().__init__()
        self.lambdas = []
        self.defs = []

    def visit_Lambda(self, node):
        self.lambdas.append(unparse(node).strip())

    def visit_FunctionDef(self, node):
        self.defs.append((node.name, unparse(node).strip()))
