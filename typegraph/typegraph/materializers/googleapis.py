# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import KW_ONLY

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime


@dataclass(eq=True, frozen=True)
class GoogleapisRuntime(Runtime):
    runtime_name: str = "googleapis"


@dataclass(eq=True, frozen=True)
class RestMat(Materializer):
    verb: str
    url: str
    _: KW_ONLY
    runtime: Runtime = GoogleapisRuntime()
    materializer_name: str = "restmat"
