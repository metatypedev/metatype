# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass

from typegraph import fx, t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    KvMaterializer,
    KvRuntimeData,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


class KvRuntime(Runtime):
    url: str

    def __init__(self, url: str):
        data = KvRuntimeData(url)
        runtime_id = runtimes.register_kv_runtime(store, data)
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)
        self.url = url

    def get(self):
        mat = self.__operation(KvMaterializer.GET, fx.read())
        return t.func(t.struct({"key": t.string()}), t.string().optional(), mat)

    def set(self):
        mat = self.__operation(KvMaterializer.SET, fx.update())
        return t.func(
            t.struct({"key": t.string(), "value": t.string()}), t.string(), mat
        )

    def delete(self):
        mat = self.__operation(KvMaterializer.DELETE, fx.delete())
        return t.func(t.struct({"key": t.string()}), t.integer(), mat)

    def keys(self):
        mat = self.__operation(KvMaterializer.KEYS, fx.read())
        return t.func(
            t.struct({"filter": t.optional(t.string())}), t.list(t.string()), mat
        )

    def values(self):
        mat = self.__operation(KvMaterializer.VALUES, fx.read())
        return t.func(
            t.struct({"filter": t.optional(t.string())}),
            t.list(t.string()),
            mat,
        )

    def __operation(self, operation: KvMaterializer, effect: Effect):
        mat_id = runtimes.kv_operation(
            store, BaseMaterializer(self.id, effect), operation
        )
        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return KvOperationMat(mat_id.value, effect=effect, operation=operation)


@dataclass
class KvOperationMat(Materializer):
    operation: KvMaterializer
