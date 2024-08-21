# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typegraph import t
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    GrpcMaterializer,
)
from typegraph.gen.types import Err
from typegraph.wit import runtimes, store


class GrpcRuntime(Runtime):
    def __init__(self, url: str):
        runtime_id = runtimes.register_grpc_runtime(store)
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)

    def call_grpc_method(self, proto_file: str, method: str, endpoint: str, fx: Effect):
        base = BaseMaterializer(self.id, fx)
        grpc_materialier = GrpcMaterializer(proto_file, method, endpoint)
        mat_id = runtimes.call_grpc_methode(store, base, grpc_materialier)

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        mat = CallGrpcMethodMat(mat_id.value, effect=fx, mat=grpc_materialier)

        return t.func(t.struct({"payload": t.optional(t.string())}), t.string(), mat)


@dataclass
class CallGrpcMethodMat(Materializer):
    mat: GrpcMaterializer
