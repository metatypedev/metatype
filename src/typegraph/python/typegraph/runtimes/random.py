# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0
from dataclasses import dataclass
from typing import Optional

from typegraph import t
from typegraph.gen.runtimes import (
    BaseMaterializer,
    MaterializerRandom,
    RandomRuntimeData,
)
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes


class RandomRuntime(Runtime):
    def __init__(self, seed: Optional[int] = None, reset: Optional[str] = ""):
        super().__init__(
            runtimes.register_random_runtime(
                data=RandomRuntimeData(seed=seed, reset=reset)
            )
        )

    def gen(
        self,
        out: "t.typedef",
    ):
        effect = "read"

        mat_id = runtimes.create_random_mat(
            base=BaseMaterializer(runtime=self.id, effect=effect),
            data=MaterializerRandom(runtime=self.id),
        )

        return t.func(
            t.struct({}),
            out,
            RandomMat(id=mat_id, runtime=self.id, effect=effect),
        )


@dataclass
class RandomMat(Materializer):
    runtime: int
