# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import TYPE_CHECKING, Callable, Optional, Union, cast

from attrs import define, field, frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.nodes import NodeProxy
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always

if TYPE_CHECKING:
    from typegraph.importers.base.importer import Importer


@frozen
class TypifyRuntime(Runtime):
    runtime_name: str = always("__typify__")

    def data(self, _c):
        raise Exception("Cannot serialize TypifyRuntime")


@frozen
class TypifyMat(Materializer):
    codegen: Union[str, Callable[[str, str], str]]
    runtime: Runtime = field(factory=TypifyRuntime)
    effect: Effect = always(effects.none())

    def data(self, _c):
        raise Exception("Cannot serialize TypifyMat")


@define
class Typify:
    importer: "Importer"
    ns: str = field(default="t")

    def __call__(self, typ: t.TypeNode, name: Optional[str] = None) -> str:
        # dispatch
        if isinstance(typ, NodeProxy):
            renames = self.importer.renames
            name = renames[typ.node] if typ.node in renames else typ.node
            return f"{self.ns}.proxy(renames[{repr(name)}])"

        if hasattr(self, typ.type):
            method = getattr(self, typ.type)
        else:
            if typ.type in simple_types:
                method = getattr(self, "simple")
            else:
                raise Exception(f"No handler for type '{typ.type}'")

        suffix = "" if name is None else f".named(renames[{repr(name)}])"
        return method(typ) + suffix

    def constraints(typ: t.typedef) -> str:
        ret = ""
        if not hasattr(typ, "_constraints"):
            return ret
        for k, v in typ._constraints().items():
            ret += f".{k}({repr(v)})"
        return ret

    def simple(self, typ: t.typedef) -> str:
        return f"{self.ns}.{typ.type}(){Typify.constraints(typ)}"

    def optional(self, typ: t.typedef) -> str:
        typ = cast(t.optional, typ)
        ret = f"{self(typ.of)}.optional()"
        if typ.default_value is not None:
            ret += f".default({repr(typ.default_value)})"
        return ret

    def object(self, typ: t.typedef) -> str:
        typ = cast(t.struct, typ)
        fields = ", ".join([f"{repr(k)}: {self(v)}" for k, v in typ.props.items()])
        ret = f"{self.ns}.struct({{{fields}}})"
        if typ.additional_props is not None:
            if isinstance(typ.additional_props, bool):
                ret += f".additional({repr(typ.additional_props)})"
            else:
                ret += f".additional({self(typ.additional)})"
        ret += Typify.constraints(typ)
        return ret

    def array(self, typ: t.typedef) -> str:
        typ = cast(t.array, typ)
        return f"{self.ns}.array({self(typ.of)}){Typify.constraints(typ)}"

    def union(self, typ: t.typedef) -> str:
        typ = cast(t.union, typ)
        variants = [self(v) for v in typ.variants]
        return f"{self.ns}.union({', '.join(variants)})"

    def function(self, typ: t.typedef) -> str:
        typ = cast(t.func, typ)
        assert isinstance(typ.mat, TypifyMat)
        codegen = typ.mat.codegen
        if callable(codegen):
            return codegen(self(typ.inp), self(typ.out))
        return f"{self.ns}.func({self(typ.inp)}, {self(typ.out)}, {typ.mat.codegen}"


simple_types = {"boolean", "number", "integer", "string"}


def typify(typ: t.typedef, ns: str = "t") -> str:
    tp = Typify(ns)
    return tp(typ)
