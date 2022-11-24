# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from attrs import field
from attrs import frozen
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.utils.attrs import always


@frozen
class GoogleapisRuntime(Runtime):
    runtime_name: str = always("googleapis")


@frozen
class RestMat(Materializer):
    verb: str
    url: str
    runtime: Runtime = field(kw_only=True, factory=GoogleapisRuntime)
    materializer_name: str = always("restmat")
