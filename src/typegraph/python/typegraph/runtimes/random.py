# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import Optional

from typegraph import t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    EffectRead,
    MaterializerRandom,
    RandomRuntimeData,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


class RandomRuntime(Runtime):
    def __init__(self, seed: Optional[int] = None, reset: Optional[str] = ""):
        super().__init__(
            runtimes.register_random_runtime(
                store, data=RandomRuntimeData(seed=seed, reset=reset)
            )
        )

    def gen(
        self,
        out: "t.typedef",
    ):
        effect = EffectRead()

        mat_id = runtimes.create_random_mat(
            store,
            base=BaseMaterializer(runtime=self.id.value, effect=effect),
            data=MaterializerRandom(runtime=self.id.value),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            t.struct({}),
            out,
            RandomMat(id=mat_id.value, runtime=self.id.value, effect=effect),
        )


@dataclass
class RandomMat(Materializer):
    runtime: int
