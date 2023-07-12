# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import ast
import hashlib
import inspect

from astunparse import unparse
from attr import field
from attrs import frozen

from typegraph import effects
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always


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
