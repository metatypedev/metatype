# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import ast
import hashlib
import inspect
from typing import List, Optional, Tuple

from astunparse import unparse
from attr import field
from attrs import frozen

from typegraph import effects
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always
from typegraph.graph.nodes import Node
from typegraph.graph.builder import Collector


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


@frozen
class Python(Runtime):
    """
    [Documentation](https://metatype.dev/docs/reference/runtimes/python)
    """

    runtime_name: str = always("python_wasi")

    def from_lambda(self, function):
        lambdas, _defs = DefinitionCollector.collect(function)
        assert len(lambdas) == 1
        fn = str(lambdas[0])
        m = hashlib.sha256()
        m.update(fn.encode("utf-8"))
        return LambdaMat(self, m.hexdigest(), fn)

    def from_def(self, function):
        _lambdas, defs = DefinitionCollector.collect(function)
        assert len(defs) == 1
        name, fn = defs[0]
        return DefMat(self, name, fn)


@frozen
class LambdaMat(Materializer):
    runtime: Runtime
    name: str
    fn: str
    materializer_name: str = always("lambda")
    effect: Effect = field(kw_only=True, default=effects.none())


@frozen
class DefMat(Materializer):
    runtime: Runtime
    name: str
    fn: str
    materializer_name: str = always("def")
    effect: Effect = field(kw_only=True, default=effects.none())


# Import function from a module
@frozen
class ImportFunMat(Materializer):
    mod: "PyModuleMat" = field()
    name: str = field(default="main")
    secrets: Tuple[str] = field(kw_only=True, factory=tuple)
    effect: Effect = field(kw_only=True, default=effects.none())
    runtime: Python = field(
        kw_only=True, factory=Python
    )  # should be the same runtime as `mod`'s
    materializer_name: str = always("import_function")
    collector_target = always(Collector.materializers)

    @property
    def edges(self) -> List[Node]:
        return super().edges + [self.mod]

    def data(self, collector: Collector) -> dict:
        data = super().data(collector)
        data["data"]["mod"] = collector.index(self.mod)
        return data


@frozen
class PyModuleMat(Materializer):
    file: Optional[str] = field(default=None)
    secrets: Tuple[str] = field(kw_only=True, factory=tuple)
    code: Optional[str] = field(kw_only=True, default=None)
    runtime: Python = field(kw_only=True, factory=Python)
    materializer_name: str = always("pymodule")
    effect: Effect = always(effects.none())

    def __attrs_post_init__(self):
        if self.file is None:
            raise Exception("you must provide the source file")
        object.__setattr__(self, "code", f"file:{self.file}")

    def imp(
        self, name: str = "main", *, effect: Effect = effects.none(), **kwargs
    ) -> ImportFunMat:
        return ImportFunMat(
            self,
            name,
            runtime=self.runtime,
            secrets=self.secrets,
            effect=effect,
            **kwargs,
        )
