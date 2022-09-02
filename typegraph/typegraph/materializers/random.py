from dataclasses import dataclass
from dataclasses import KW_ONLY
from typing import Optional

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime


@dataclass(eq=True, frozen=True)
class RandomRuntime(Runtime):
    _: KW_ONLY
    runtime_name: str = "random"
    seed: Optional[int] = None
    reset: str = ""


@dataclass(eq=True, frozen=True)
class RandomMat(Materializer):
    _: KW_ONLY
    runtime: Runtime = RandomRuntime()
    materializer_name: str = "random"
