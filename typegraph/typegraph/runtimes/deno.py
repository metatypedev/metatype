# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import os
from typing import Any, Dict, List, Optional, Tuple

from attrs import field, frozen
from frozendict import frozendict

from typegraph import effects
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import SKIP, always


@frozen
class DenoRuntime(Runtime):
    worker: str = field(kw_only=True, default="default")
    allow_net: Tuple[str, ...] = field(
        kw_only=True, factory=tuple, metadata={SKIP: True}
    )
    permissions: Dict[str, Any] = field(factory=frozendict, init=False)
    runtime_name: str = always("deno")

    def __attrs_post_init__(self):
        permissions = {}
        if len(self.allow_net) > 0:
            if "*" in self.allow_net:
                permissions["net"] = True
            else:
                permissions["net"] = self.allow_net
        object.__setattr__(self, "permissions", frozendict(permissions))


# Inlined fuction
@frozen
class FunMat(Materializer):
    fn_expr: Optional[str] = field(default=None, metadata={SKIP: True})

    # a script that assigns a function expression into the variable _my_lambda
    script: Optional[str] = field(kw_only=True, default=None)
    runtime: DenoRuntime = field(kw_only=True, factory=DenoRuntime)
    materializer_name: str = field(default="function", init=False)
    effect: Effect = field(kw_only=True, default=effects.none())

    def __attrs_post_init__(self):
        if self.fn_expr is None:
            if self.script is None:
                raise Exception("you must give the script or a function expression")
        else:
            if self.script is not None:
                raise Exception(
                    "you must only give either the script or a function expression"
                )
            object.__setattr__(self, "script", f"var _my_lambda = {self.fn_expr};")


@frozen
class PureFunMat(FunMat):
    effect: Effect = always(effects.none())


@frozen
class PredefinedFunMat(Materializer):
    name: str
    effect: Effect = field(kw_only=True, default=effects.none())
    runtime: DenoRuntime = field(kw_only=True, factory=DenoRuntime)
    materializer_name: str = always("predefined_function")


# Import function from a module
@frozen
class ImportFunMat(Materializer):
    mod: "ModuleMat" = field()
    name: str = field(default="default")
    secrets: Tuple[str] = field(kw_only=True, factory=tuple)
    effect: Effect = field(kw_only=True, default=effects.none())
    runtime: DenoRuntime = field(
        kw_only=True, factory=DenoRuntime
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
class ModuleMat(Materializer):
    file: Optional[str] = field(default=None, metadata={SKIP: True})
    secrets: Tuple[str] = field(kw_only=True, factory=tuple)
    code: Optional[str] = field(kw_only=True, default=None)
    runtime: DenoRuntime = field(kw_only=True, factory=DenoRuntime)  # DenoRuntime
    materializer_name: str = always("module")
    effect: Effect = always(effects.none())

    def __attrs_post_init__(self):
        if self.file is None:
            if self.code is None:
                raise Exception(
                    f"you must give source code for the module: {self.file}"
                )
        else:
            if self.code is not None:
                raise Exception("you must only give either source file or source code")

            from typegraph.graph.typegraph import get_absolute_path

            path = get_absolute_path(self.file)
            if os.environ.get("DONT_READ_EXTERNAL_TS_FILES"):
                object.__setattr__(self, "code", f"file:{path}")
            else:
                with open(path) as f:
                    object.__setattr__(self, "code", f.read())

    def imp(
        self, name: str = "default", *, effect: Effect = effects.none(), **kwargs
    ) -> ImportFunMat:
        return ImportFunMat(
            self,
            name,
            runtime=self.runtime,
            secrets=self.secrets,
            effect=effect,
            **kwargs,
        )


@frozen
class IdentityMat(PredefinedFunMat):
    name: str = always("identity")
    effect: Effect = always(effects.none())
