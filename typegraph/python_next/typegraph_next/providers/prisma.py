# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union

from typegraph_next.runtimes.base import Runtime
from typegraph_next.wit import runtimes, store
from typegraph_next.gen.types import Err
from typegraph_next.gen.exports.runtimes import PrismaRuntimeData
from typegraph_next import t


class PrismaRuntime(Runtime):
    name: str
    connection_string_secret: str

    def __init__(self, name: str, connection_string_secret: str):
        runtime_id = runtimes.register_prisma_runtime(
            store, PrismaRuntimeData(name, connection_string_secret)
        )
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)
        self.name = name
        self.connection_string_secret = connection_string_secret

    def find_unique(self, model: Union[str, t.typedef]) -> t.typedef:
        if isinstance(model, str):
            model = t.ref(model)
        type_id = runtimes.prisma_find_unique(store, self.id, model.id)
        if isinstance(type_id, Err):
            raise Exception(type_id.value)
        return t.typedef(type_id.value)

    def find_many(self, model: Union[str, t.typedef]) -> t.typedef:
        if isinstance(model, str):
            model = t.ref(model)
        type_id = runtimes.prisma_find_many(store, self.id, model.id)
        if isinstance(type_id, Err):
            raise Exception(type_id.value)
        return t.typedef(type_id.value)

    def find_first(self, model: Union[str, t.typedef]) -> t.typedef:
        if isinstance(model, str):
            model = t.ref(model)
        type_id = runtimes.prisma_find_first(store, self.id, model.id)
        if isinstance(type_id, Err):
            raise Exception(type_id.value)
        return t.typedef(type_id.value)

    def create(self, model: Union[str, t.typedef]) -> t.typedef:
        if isinstance(model, str):
            model = t.ref(model)
        type_id = runtimes.prisma_create_one(store, self.id, model.id)
        if isinstance(type_id, Err):
            raise Exception(type_id.value)
        return t.typedef(type_id.value)

    def create_many(self, model: Union[str, t.typedef]) -> t.typedef:
        if isinstance(model, str):
            model = t.ref(model)
        type_id = runtimes.prisma_create_many(store, self.id, model.id)
        if isinstance(type_id, Err):
            raise Exception(type_id.value)
        return t.typedef(type_id.value)
