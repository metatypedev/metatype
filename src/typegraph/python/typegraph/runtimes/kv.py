# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass

from typegraph import fx, t
from typegraph.gen.runtimes import (
    BaseMaterializer,
    Effect,
    KvMaterializer,
    KvRuntimeData,
)
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes


class KvRuntime(Runtime):
    url: str

    def __init__(self, url: str):
        data = KvRuntimeData(url)
        runtime_id = runtimes.register_kv_runtime(data)
        super().__init__(runtime_id)
        self.url = url

    def get(self):
        mat = self.__operation("get", fx.read())
        return t.func(t.struct({"key": t.string()}), t.string().optional(), mat)

    def set(self):
        mat = self.__operation("set", fx.update())
        return t.func(
            t.struct({"key": t.string(), "value": t.string()}), t.string(), mat
        )

    def delete(self):
        mat = self.__operation("delete", fx.delete())
        return t.func(t.struct({"key": t.string()}), t.integer(), mat)

    def keys(self):
        mat = self.__operation("keys", fx.read())
        return t.func(
            t.struct({"filter": t.optional(t.string())}), t.list(t.string()), mat
        )

    def values(self):
        mat = self.__operation("values", fx.read())
        return t.func(
            t.struct({"filter": t.optional(t.string())}),
            t.list(t.string()),
            mat,
        )

    def lpush(self):
        mat = self.__operation("lpush", fx.update())
        return t.func(
            t.struct({"key": t.string(), "value": t.string()}), t.integer(), mat
        )

    def rpush(self):
        mat = self.__operation("rpush", fx.update())
        return t.func(
            t.struct({"key": t.string(), "value": t.string()}), t.integer(), mat
        )

    def lpop(self):
        mat = self.__operation("lpop", fx.update())
        return t.func(
            t.struct({"key": t.string()}),
            t.optional(t.string()),
            mat,
        )

    def rpop(self):
        mat = self.__operation("rpop", fx.update())
        return t.func(
            t.struct({"key": t.string()}),
            t.optional(t.string()),
            mat,
        )

    def __operation(self, operation: KvMaterializer, effect: Effect):
        mat_id = runtimes.kv_operation(BaseMaterializer(self.id, effect), operation)

        return KvOperationMat(mat_id, effect=effect, operation=operation)


@dataclass
class KvOperationMat(Materializer):
    operation: KvMaterializer
