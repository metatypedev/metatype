# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t
from typegraph.gen.runtimes import (
    GrpcData,
    GrpcRuntimeData,
)
from typegraph.runtimes.base import Runtime
from typegraph.sdk import runtimes


class GrpcRuntime(Runtime):
    def __init__(self, proto_file: str, endpoint: str):
        data = GrpcRuntimeData(proto_file, endpoint)
        runtime_id = runtimes.register_grpc_runtime(data)
        super().__init__(runtime_id)

    def call(self, method: str):
        data = GrpcData(method)
        func_data = runtimes.call_grpc_method(self.id, data)
        return t.func.from_type_func(func_data)
