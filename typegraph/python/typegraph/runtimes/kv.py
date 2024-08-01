# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Optional
from dataclasses import dataclass

from typegraph.gen.types import Err
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    KvRuntimeData,
    KvMaterializer,
)
from typegraph import fx, t
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


class KvRuntime(Runtime):
    host: str
    port: Optional[str]
    db_number: Optional[int]
    password: Optional[str]

    def __init__(
        self,
        host: str,
        port: Optional[str],
        db_number: Optional[int],
        password: Optional[str],
    ):
        data = KvRuntimeData(
            host=host, port=port, db_number=db_number, password=password
        )
        runtime_id = runtimes.register_kv_runtime(store, data)
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)
        self.host = host
        self.port = port
        self.db_number = db_number
        self.password = password

    def get(self):
        mat = self.__operation(KvMaterializer.GET, fx.read())
        return t.func(t.struct({"key": t.string()}), t.string(), mat)

    def set(self):
        mat = self.__operation(KvMaterializer.SET, fx.write())
        return t.func(
            t.struct({"key": t.string(), "value": t.string()}), t.string(), mat
        )

    def delete(self, key: str):
        mat = self.__operation(KvMaterializer.DELETE, fx.write())
        return t.func(t.struct({"key": t.string()}), t.string(), mat)

    def keys(self):
        mat = self.__operation(KvMaterializer.KEYS, fx.read())
        return t.func(t.struct({"filter": Optional[t.string()]}), list[t.string()], mat)

    def all(self):
        mat = self.__operation(KvMaterializer.ALL, fx.read())
        return t.func(
            t.struct({"filter": Optional[t.string()]}),
            list[tuple[t.string(), t.string()]],
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
