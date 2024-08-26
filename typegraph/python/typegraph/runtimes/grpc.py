# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typegraph import t
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    GrpcMaterializer,
    GrpcRuntimeData,
)
from typegraph.gen.types import Err
from typegraph.wit import runtimes, store


class GrpcRuntime(Runtime):
    def __init__(self, proto_file: str, endpoint: str):
        data = GrpcRuntimeData(proto_file, endpoint)
        runtime_id = runtimes.register_grpc_runtime(store, data)
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)

    def call_grpc_method(self, method: str, effect: Effect):
        base = BaseMaterializer(self.id, effect)

        grpc_materialier = GrpcMaterializer(method)

        mat_id = runtimes.call_grpc_methode(store, base, grpc_materialier)

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        mat = CallGrpcMethodMat(mat_id.value, effect, mat=grpc_materialier)

        return t.func(t.struct({"payload": t.optional(t.string())}), t.string(), mat)


@dataclass
class CallGrpcMethodMat(Materializer):
    mat: GrpcMaterializer
