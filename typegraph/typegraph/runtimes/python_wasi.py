# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
        self.lambdas.append(unparse(node).strip())


@frozen
class PythonWasiRuntime(Runtime):
    runtime_name: str = always("python_wasi")

    def from_lambda(self, function):
        lambdas = LambdaCollector.collect(function)
        assert len(lambdas) == 1
        fn = str(lambdas[0])
        m = hashlib.sha256()
        m.update(fn.encode("utf-8"))
        return LambdaMat(self, m.hexdigest(), fn)


@frozen
class LambdaMat(Materializer):
    runtime: Runtime
    name: str
    fn: str
    materializer_name: str = always("lambda")
    effect: Effect = field(kw_only=True, default=effects.none())
