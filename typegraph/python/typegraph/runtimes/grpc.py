# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from pathlib import PosixPath
from attrs import frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


@frozen
class GrpcRuntime(Runtime):
    """Runs Grpc functions on the Grpc runtime.

    **Experimental**
    """

    endpoint: str
    runtime_name: str = always("grpc")

    def data(self, collector):
        return {
            **super().data(collector),
        }

    def call_method(
        self,
        proto_file: PosixPath,
        method: str,
        inp,
        out,
        effect: Effect = effects.none(),
        **kwargs
    ):
        return t.func(
            inp,
            out,
            GrpcMat(self, str(proto_file.absolute()), method, effect=effect, **kwargs),
        )


@frozen
class GrpcMat(Materializer):
    runtime: Runtime
    proto_file: str
    method: str
    effect: Effect = required()
    materializer_name: str = always("grpc_materializer")
