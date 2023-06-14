# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import List, TYPE_CHECKING, Optional
from typegraph.gen.exports.runtimes import (
    EffectNone,
    Effect,
    MaterializerDenoFunc,
)
from typegraph.gen.types import Err
from typegraph.wit import runtimes, store


if TYPE_CHECKING:
    from typegraph import t


@dataclass
class Runtime:
    id: int


@dataclass
class Materializer:
    id: int


class DenoRuntime(Runtime):
    def __init__(self, id: int):
        raise Exception("Deno runtime is not instatiable")

    @classmethod
    def func(
        cls,
        inp: "t.struct",
        out: "t.typedef",
        *,
        code: str,
        secrets: Optional[List[str]] = None,
        effect: Optional[Effect] = None,
    ):
        secrets = secrets or []
        effect = effect or EffectNone()
        mat_id = runtimes.register_deno_func(
            store,
            MaterializerDenoFunc(code=code, secrets=secrets),
            effect,
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        from typegraph import t

        return t.func(
            inp, out, FunMat(mat_id.value, code=code, secrets=secrets, effect=effect)
        )


@dataclass
class FunMat(Materializer):
    code: str
    secrets: List[str]
    effect: Effect
