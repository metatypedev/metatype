# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union, Optional

from typegraph.runtimes.base import Runtime
from typegraph.wit import ErrorStack, runtimes, store
from typegraph.gen.types import Err
from typegraph.gen.exports.runtimes import (
    Effect,
    PrismaRuntimeData,
    PrismaLinkData,
)
from typegraph import t
from typegraph.graph.typegraph import gen_ref


class PrismaRuntime(Runtime):
    name: str
    connection_string_secret: str

    def __init__(self, name: str, connection_string_secret: str):
        runtime_id = runtimes.register_prisma_runtime(
            store, PrismaRuntimeData(name, connection_string_secret)
        )
        if isinstance(runtime_id, Err):
            raise ErrorStack(runtime_id.value)

        super().__init__(runtime_id.value)
        self.name = name
        self.connection_string_secret = connection_string_secret

    def find_unique(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_unique(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def find_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_many(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def find_first(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_first(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def aggregate(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_aggregate(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def count(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_count(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def group_by(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_group_by(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def create(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_create_one(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def create_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_create_many(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def update(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_update_one(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def update_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_update_many(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def upsert(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_upsert_one(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def delete(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_delete_one(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def delete_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_delete_many(store, self.id, model._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def execute(self, query: str, parameters: t.typedef, effect: Effect) -> t.func:
        type = runtimes.prisma_execute(store, self.id, query, parameters._id, effect)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def query_raw(
        self, query: str, parameters: Union[None, t.typedef], output: t.typedef
    ) -> t.func:
        params_id = None if parameters is None else parameters._id
        type = runtimes.prisma_query_raw(store, self.id, query, params_id, output._id)
        if isinstance(type, Err):
            raise ErrorStack(type.value)
        return t.func.from_type_func(type.value)

    def link(
        self,
        target_type: Union[str, t.typedef],
        name: Optional[str] = None,
        *,
        fkey: Optional[bool] = None,
        field: Optional[str] = None,
        unique: Optional[bool] = None,
    ):
        return prisma_link(
            target_type, name=name, fkey=fkey, field=field, unique=unique
        )


def prisma_link(
    target_type: Union[str, t.typedef],
    name: Optional[str] = None,
    *,
    fkey: Optional[bool] = None,
    field: Optional[str] = None,
    unique: Optional[bool] = None,
):
    if isinstance(target_type, str):
        target_type = gen_ref(target_type)
    type_id = runtimes.prisma_link(
        store,
        PrismaLinkData(
            target_type=target_type._id,
            relationship_name=name,
            foreign_key=fkey,
            target_field=field,
            unique=unique,
        ),
    )

    if isinstance(type_id, Err):
        raise ErrorStack(type_id.value)
    return t.typedef(type_id.value)
