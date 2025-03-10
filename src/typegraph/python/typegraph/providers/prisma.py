# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union, Optional

from typegraph.runtimes.base import Runtime
from typegraph.sdk import runtimes
from typegraph.gen.runtimes import (
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
            PrismaRuntimeData(name, connection_string_secret)
        )

        super().__init__(runtime_id)
        self.name = name
        self.connection_string_secret = connection_string_secret

    def find_unique(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_unique(self.id, model._id)
        return t.func.from_type_func(type)

    def find_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_many(self.id, model._id)
        return t.func.from_type_func(type)

    def find_first(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_find_first(self.id, model._id)
        return t.func.from_type_func(type)

    def aggregate(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_aggregate(self.id, model._id)
        return t.func.from_type_func(type)

    def group_by(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_group_by(self.id, model._id)
        return t.func.from_type_func(type)

    def create(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_create_one(self.id, model._id)
        return t.func.from_type_func(type)

    def create_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_create_many(self.id, model._id)
        return t.func.from_type_func(type)

    def update(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_update_one(self.id, model._id)
        return t.func.from_type_func(type)

    def update_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_update_many(self.id, model._id)
        return t.func.from_type_func(type)

    def upsert(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_upsert_one(self.id, model._id)
        return t.func.from_type_func(type)

    def delete(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_delete_one(self.id, model._id)
        return t.func.from_type_func(type)

    def delete_many(self, model: Union[str, t.typedef]) -> t.func:
        if isinstance(model, str):
            model = gen_ref(model)
        type = runtimes.prisma_delete_many(self.id, model._id)
        return t.func.from_type_func(type)

    def execute(self, query: str, parameters: t.typedef, effect: Effect) -> t.func:
        type = runtimes.prisma_execute(self.id, query, parameters._id, effect)
        return t.func.from_type_func(type)

    def query_raw(
        self, query: str, parameters: Union[None, t.typedef], output: t.typedef
    ) -> t.func:
        params_id = None if parameters is None else parameters._id
        type = runtimes.prisma_query_raw(self.id, query, output._id, params_id)
        return t.func.from_type_func(type)

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
        PrismaLinkData(
            target_type=target_type._id,
            relationship_name=name,
            foreign_key=fkey,
            target_field=field,
            unique=unique,
        ),
    )

    return t.typedef(type_id)
