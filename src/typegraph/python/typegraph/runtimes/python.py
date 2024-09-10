# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
import ast
import inspect
from dataclasses import dataclass
from typing import TYPE_CHECKING, List, Optional

from astunparse import unparse
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    EffectRead,
    MaterializerPythonDef,
    MaterializerPythonImport,
    MaterializerPythonLambda,
    MaterializerPythonModule,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store

if TYPE_CHECKING:
    from typegraph import t


class PythonRuntime(Runtime):
    def __init__(self):
        super().__init__(runtimes.register_python_runtime(store))

    def from_lambda(
        self,
        inp: "t.struct",
        out: "t.typedef",
        function: callable,
        *,
        effect: Effect = EffectRead(),
        # secrets: Optional[List[str]] = None,
    ):
        lambdas, _defs = DefinitionCollector.collect(function)
        assert len(lambdas) == 1
        fn = str(lambdas[0])
        if fn.startswith("(") and fn.endswith(")"):
            fn = fn[1:-1]
        mat_id = runtimes.from_python_lambda(
            store,
            BaseMaterializer(runtime=self.id.value, effect=effect),
            MaterializerPythonLambda(runtime=self.id.value, fn=fn),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        from typegraph import t

        return t.func(
            inp,
            out,
            LambdaMat(id=mat_id.value, fn=fn, effect=effect),
        )

    def from_def(
        self,
        inp: "t.struct",
        out: "t.typedef",
        function: callable,
        *,
        effect: Effect = EffectRead(),
    ):
        _lambdas, defs = DefinitionCollector.collect(function)
        assert len(defs) == 1
        name, fn = defs[0]

        mat_id = runtimes.from_python_def(
            store,
            BaseMaterializer(runtime=self.id.value, effect=effect),
            MaterializerPythonDef(runtime=self.id.value, name=name, fn=fn),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        from typegraph import t

        return t.func(
            inp,
            out,
            DefMat(id=mat_id.value, name=name, fn=fn, effect=effect),
        )

    def import_(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        module: str,
        name: str,
        deps: List[str] = [],
        effect: Optional[Effect] = None,
        secrets: Optional[List[str]] = None,
    ):
        effect = effect or EffectRead()
        secrets = secrets or []

        base = BaseMaterializer(runtime=self.id.value, effect=effect)
        mat_id = runtimes.from_python_module(
            store,
            base,
            MaterializerPythonModule(
                file=module,
                deps=deps,
                runtime=self.id.value,
            ),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        py_mod_mat_id = runtimes.from_python_import(
            store,
            base,
            MaterializerPythonImport(
                module=mat_id.value, func_name=name, secrets=secrets
            ),
        )

        if isinstance(py_mod_mat_id, Err):
            raise Exception(py_mod_mat_id.value)

        from typegraph import t

        return t.func(
            inp,
            out,
            ImportMat(
                id=py_mod_mat_id.value,
                name=name,
                module=module,
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
