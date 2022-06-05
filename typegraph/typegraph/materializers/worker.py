import ast
from dataclasses import dataclass
from dataclasses import KW_ONLY
import inspect

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t


@dataclass(eq=True, frozen=True)
class WorkerRuntime(Runtime):
    runtime_name: str = "worker"


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


@dataclass(eq=True, frozen=True)
class JavascriptMat(Materializer):
    code: str
    materializer_name: str
    _: KW_ONLY
    runtime: Runtime = WorkerRuntime()

    @classmethod
    def policy(cls, tpe, f):
        impl = JavascriptMat.lift(f)
        return t.policy(tpe, JavascriptMat(impl, "policy"))

    @classmethod
    def lift(cls, function):
        from metapensiero.pj.__main__ import transform_string

        lambdas = LambdaCollector.collect(function)
        assert len(lambdas) == 1
        code = transform_string(lambdas[0]).rstrip().rstrip(";")
        return code
