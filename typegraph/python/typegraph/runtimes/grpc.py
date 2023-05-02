# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


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
        proto_file: str,
        method: str,
        inp,
        out,
        effect: Effect = effects.none(),
        **kwargs
    ):
        return t.func(
            inp, out, GrpcMat(self, proto_file, method, effect=effect, **kwargs)
        )


@frozen
class GrpcMat(Materializer):
    runtime: Runtime
    proto_file: str
    method: str
    effect: Effect = required()
    materializer_name: str = always("grpc_materializer")
