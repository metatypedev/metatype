# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, List, Optional

from typegraph.gen.runtimes import (
    Effect,
    MaterializerDenoFunc,
    MaterializerDenoImport,
    MaterializerDenoPredefined,
    MaterializerDenoStatic,
)
from typegraph.policy import Policy
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes

# from typegraph.sdk import sdk_utils


if TYPE_CHECKING:
    from typegraph import t


class DenoRuntime(Runtime):
    def __init__(self):
        super().__init__(runtimes.get_deno_runtime())

    def static(self, out: "t.typedef", value: Any):
        from typegraph import t

        mat_id = runtimes.register_deno_static(
            MaterializerDenoStatic(json.dumps(value)), out._id
        )

        return t.func(
            t.struct(),
            out,
            StaticMat(
                mat_id,
                value=value,
                effect="read",
            ),
        )

    def func(
        self,
        inp: "t.struct",
        out: "t.typedef",
        *,
        code: str,
        secrets: Optional[List[str]] = None,
        effect: Optional[Effect] = None,
    ):
        secrets = secrets or []
        effect = effect or "read"
        mat_id = runtimes.register_deno_func(
            MaterializerDenoFunc(code=code, secrets=secrets),
            effect,
        )

        from typegraph import t

        return t.func(
            inp, out, FunMat(mat_id, code=code, secrets=secrets, effect=effect)
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
        effect = effect or "read"
        secrets = secrets or []
        mat_id = runtimes.import_deno_function(
            MaterializerDenoImport(
                func_name=name, module=module, secrets=secrets, deps=deps
            ),
            effect,
        )

        from typegraph import t

        return t.func(
            inp,
            out,
            ImportMat(
                id=mat_id,
                name=name,
                module=module,
                secrets=secrets,
                effect=effect,
            ),
        )

    def identity(self, inp: "t.struct") -> "t.func":
        from typegraph import t

        res = runtimes.get_predefined_deno_func(
            MaterializerDenoPredefined(name="identity")
        )

        return t.func(
            inp,
            inp,
            PredefinedFunMat(id=res, name="identity", effect="read"),
        )

    def policy(
        self, name: str, code: str, secrets: Optional[List[str]] = None
    ) -> Policy:
        secrets = secrets or []
        mat_id = runtimes.register_deno_func(
            MaterializerDenoFunc(code=code, secrets=secrets),
            "read",
        )

        return Policy.create(
            name,
            mat_id,
        )

    def import_policy(
        self,
        func_name: str,
        module: str,
        secrets: Optional[List[str]] = None,
        name: Optional[str] = None,
    ) -> Policy:
        name = name or re.sub("[^a-zA-Z0-9_]", "_", f"__imp_{module}_{name}")

        res = runtimes.import_deno_function(
            MaterializerDenoImport(
                func_name=func_name, module=module, secrets=secrets or []
            ),
            "read",
        )

        return Policy.create(name, res)


@dataclass
class FunMat(Materializer):
    code: str
    secrets: List[str]


@dataclass
class StaticMat(Materializer):
    value: Any


@dataclass
class ImportMat(Materializer):
    module: str
    name: str
    secrets: List[str]


@dataclass
class PredefinedFunMat(Materializer):
    name: str
