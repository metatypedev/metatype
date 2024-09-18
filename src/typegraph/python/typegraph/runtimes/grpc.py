# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t
from typegraph.gen.exports.runtimes import (
    GrpcData,
    GrpcRuntimeData,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class GrpcRuntime(Runtime):
    def __init__(self, proto_file: str, endpoint: str):
        data = GrpcRuntimeData(proto_file, endpoint)
        runtime_id = runtimes.register_grpc_runtime(store, data)
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)

    def call(self, method: str):
        data = GrpcData(method)
        func_data = runtimes.call_grpc_method(store, self.id, data)

        if isinstance(func_data, Err):
            raise Exception(func_data.value)

        return t.func.from_type_func(func_data.value)
