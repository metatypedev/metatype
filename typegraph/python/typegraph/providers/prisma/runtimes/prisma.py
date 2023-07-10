# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Optional, Union, Any, Dict

from attrs import field, frozen
from frozendict import frozendict

from typegraph import effects, utils
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.graph.typegraph import TypegraphContext
from typegraph.providers.prisma.relations import LinkProxy, Registry
from typegraph.providers.prisma.type_generator import TypeGenerator
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import SKIP, always, required


def comp_exp(tpe):
    name = f"bool_exp_{tpe.name}"
    return t.struct(
        {
            "_eq": t.proxy(name),
            "_gt": t.proxy(name),
            "_gte": t.proxy(name),
            "_in": t.array(t.proxy(name)),
            "_is_null": t.boolean(),
            "_lt": t.proxy(name),
            "_lte": t.proxy(name),
            "_neq": t.proxy(name),
            "_nin": t.array(t.proxy(name)),
        }
    ).named(name)


def bool_exp(tpe: t.struct):
    name = f"bool_exp_{tpe.name}"
    g = TypegraphContext.get_active()
    return t.struct(
        {
            "_and": t.array(g(name)),
            "_not": g(name),
            "_or": t.array(g(name)),
        }
    ).named(name)


def sql_select(tpe: t.struct):
    cols = tpe.props.keys()

    return t.struct(
        {
            "distinct_on": t.array(t.enum(cols)).named(f"sql_distinct_on_{tpe.name}"),
            "limit": t.unsigned_integer(),
            "offset": t.unsigned_integer(),
            "order_by": t.array(t.tuple([t.enum(cols), t.string()])).named(
                f"sql_order_by_{tpe.name}"
            ),
            "where": bool_exp(tpe).optional(),
        }
    )


def sql_insert(tpe: t.struct):
    return t.struct(
        {
            "objects": t.array(
                t.struct(
                    {
                        field_name: field_type
                        for field_name, field_type in tpe.props.items()
                    }
                )
            ),
        }
    )


def sql_update(tpe: t.struct):
    return t.struct(
        {
            "_set": t.struct(
                {field_name: field_type for field_name, field_type in tpe.props.items()}
            ),
            "where": bool_exp(tpe),
        }
    )


def sql_delete(tpe: t.struct):
    return t.struct({"where": bool_exp(tpe)})


def get_name_generator(op_label: str, tpe: t.struct):
    return lambda name: f"{tpe.name}{op_label}{name}"


@frozen
class PrismaOperationMat(Materializer):
    runtime: "PrismaRuntime"
    table: str
    operation: str
    materializer_name: str = always("prisma_operation")
    effect: Effect = required()


# https://github.com/prisma/prisma-engines/tree/main/query-engine/connector-test-kit-rs/query-engine-tests/tests/queries
@frozen
class PrismaRuntime(Runtime):
    """
    [Documentation](https://metatype.dev/docs/reference/runtimes/prisma)

    Attributes:
    name: Name of prisma runtime
    connection_string_secret: Name of the secret that contains the connection string
    that will be used to connect to the database
    """

    name: str
    connection_string_secret: str
    runtime_name: str = always("prisma")
    reg: Registry = field(init=False, hash=False, metadata={SKIP: True})
    __typegen: TypeGenerator = field(init=False, hash=False, metadata={SKIP: True})

    def __attrs_post_init__(self):
        object.__setattr__(self, "reg", Registry())
        object.__setattr__(self, "_PrismaRuntime__typegen", TypeGenerator(reg=self.reg))

    def link(
        self,
        typ: Union[t.TypeNode, str],
        name: Optional[str] = None,
        *,
        field: Optional[str] = None,
        fkey: Optional[bool] = None,
    ) -> t.TypeNode:
        """
        Arguments:
        name: name of the relationship
        field: name of the target field on the target model
        """
        if isinstance(typ, t.typedef) or isinstance(typ, NodeProxy):
            g = typ.graph
            if isinstance(typ, t.typedef):
                typ.register_name()
            typ = typ.name
        else:
            g = TypegraphContext.get_active()
        return LinkProxy(g, typ, rel_name=name, field=field, fkey=fkey)

    def raw_query(self, query: str, out: t.TypeNode, *, effect: Effect) -> t.func:
        return t.func(
            t.struct(
                {
                    "parameters": t.json(),
                }
            ).named("QueryRawInp"),
            out,
            PrismaOperationMat(self, query, "queryRaw", effect=effect),
        )

    def raw_execute(self, query: str, *, effect: Effect) -> t.func:
        return t.func(
            t.struct(
                {
                    "parameters": t.json().optional().default("[]"),
                }
            ).named(f"ExecuteRawInp_{TypegraphContext.get_active().next_type_id()}"),
            t.integer(),
            PrismaOperationMat(self, query, "executeRaw", effect=effect),
        )

    def find_unique(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Unique", tpe)
        # output = typegen.get_out_type(base_output)
        output = typegen.add_nested_count(tpe)
        if where is None:
            # findUnique's where expression
            # does not allow AND, OR, NOT
            where = (
                typegen.gen_query_unique_where_expr(tpe)
                .named(_pref("Where"))
                .optional()
            )
        return t.func(
            t.struct({"where": where}),
            output.named(_pref("Output")).optional(),
            PrismaOperationMat(self, tpe.name, "findUnique", effect=effects.none()),
        )

    def find_many(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Many", tpe)
        rel_cols = tpe.props.keys()
        # output = typegen.get_out_type(base_output)
        output = typegen.add_nested_count(tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Where")).optional()
        return t.func(
            t.struct(
                {
                    "where": where,
                    "orderBy": typegen.get_order_by_type(tpe)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "distinct": t.array(t.enum(rel_cols))
                    .named(_pref("Distinct"))
                    .optional(),
                }
            ),
            t.array(output.named(_pref("Output"))),
            PrismaOperationMat(self, tpe.name, "findMany", effect=effects.none()),
        )

    def find_first(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("First", tpe)
        output = typegen.get_out_type(tpe)
        rel_cols = tpe.props.keys()
        output = typegen.get_out_type(tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Where")).optional()
        return t.func(
            t.struct(
                {
                    "where": where,
                    "orderBy": typegen.get_order_by_type(tpe)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "distinct": t.array(t.enum(rel_cols))
                    .named(_pref("Distinct"))
                    .optional(),
                }
            ),
            output.named(_pref("Output")).optional(),
            PrismaOperationMat(self, tpe.name, "findFirst", effect=effects.none()),
        )

    def aggregate(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Aggregate", tpe)
        tpe_nums = typegen.extract_number_types(tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Where")).optional()
        return t.func(
            t.struct(
                {
                    "where": where,
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                }
            ).named(_pref("Input")),
            t.struct(
                {
                    "_count": t.struct({"_all": t.integer()})
                    .compose(tpe.props)
                    .named(_pref("Count")),
                    "_avg": typegen.promote_num_to_float(tpe_nums).named(_pref("Avg")),
                    "_sum": tpe_nums.named(_pref("Sum")),
                    "_min": tpe_nums.named(_pref("Min")),
                    "_max": tpe_nums.named(_pref("Max")),
                }
            ).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "aggregate", effect=effects.none()),
        )

    def group_by(
        self, tpe: Union[t.struct, t.NodeProxy], where=None, having=None
    ) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("GroupBy", tpe)
        tpe_nums = typegen.extract_number_types(tpe)
        count_props = {k: t.integer() for k in tpe.props.keys()}
        count_props["_all"] = t.integer()
        aggreg_def = t.struct(
            {
                "_count": t.struct(count_props).named(_pref("Count")).optional(),
                "_avg": typegen.promote_num_to_float(tpe_nums)
                .named(_pref("Avg"))
                .optional(),
                "_sum": tpe_nums.named(_pref("Sum")).optional(),
                "_min": tpe_nums.named(_pref("Min")).optional(),
                "_max": tpe_nums.named(_pref("Max")).optional(),
            }
        )
        row_def = tpe.compose(aggreg_def.props)
        if where is None:
            where = (
                typegen.gen_query_where_expr(tpe, skip_rel=True)
                .named(_pref("Where"))
                .optional()
            )
        if having is None:
            having = (
                typegen.gen_having_expr(tpe, aggreg_def)
                .named(_pref("Having"))
                .optional()
            )
        return t.func(
            t.struct(
                {
                    "by": t.array(t.string()).named(_pref("By")),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "where": where,
                    "orderBy": typegen.get_order_by_type(row_def)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "having": having,
                }
            ).named(_pref("Input")),
            t.array(row_def).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "groupBy", effect=effects.none()),
        )

    def create(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Create", tpe)
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe).named(_pref("Input")),
                }
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "createOne", effect=effects.create()),
        )

    def create_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("CreateMany", tpe)
        return t.func(
            t.struct(
                {
                    "data": t.array(typegen.get_input_type(tpe)).named(_pref("Input")),
                }
            ),
            t.struct({"count": t.integer()}).named(_pref("BatchPayload")),
            PrismaOperationMat(self, tpe.name, "createMany", effect=effects.create()),
        )

    def update(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(f"{tpe.name}UpdateOneWhere")
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe, update=True).named(
                        f"{tpe.name}UpdateInput"
                    ),
                    "where": where,
                }
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}UpdateOutput"),
            PrismaOperationMat(
                self, tpe.name, "updateOne", effect=effects.update(True)
            ),
        )

    def update_many(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("UpdateMany", tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Where"))
        return t.func(
            t.struct(
                {
                    "data": typegen.get_update_data_type(tpe).named(_pref("Data")),
                    "where": where,
                }
            ),
            t.struct({"count": t.integer()}).named(_pref("BatchPayload")),
            PrismaOperationMat(
                self, tpe.name, "updateMany", effect=effects.update(True)
            ),
        )

    def upsert(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Upsert", tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Where"))
        return t.func(
            t.struct(
                {
                    "where": where,
                    "create": typegen.get_input_type(tpe).named(_pref("Create")),
                    "update": typegen.get_update_data_type(tpe).named(_pref("Update")),
                }
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(
                self, tpe.name, "upsertOne", effect=effects.update(True)
            ),
        )

    def delete(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Delete", tpe)
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(_pref("Input"))
        return t.func(
            t.struct({"where": where}),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "deleteOne", effect=effects.delete()),
        )

    def delete_many(self, tpe: Union[t.struct, t.NodeProxy], where=None) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        if where is None:
            where = typegen.gen_query_where_expr(tpe).named(
                f"{tpe.name}DeleteManyWhereInput"
            )
        return t.func(
            t.struct({"where": where}),
            t.struct({"count": t.integer()}).named(f"{tpe.name}BatchDeletePayload"),
            PrismaOperationMat(self, tpe.name, "deleteMany", effect=effects.delete()),
        )

    def __manage(self, tpe):
        tpe._propagate_runtime(self)
        self.reg.manage(tpe)

    def data(self, collector: Collector) -> dict:
        data = super().data(collector)
        data["data"].update(
            connection_string_secret=self.connection_string_secret,
            models=[collector.index(tp) for tp in self.reg.managed.values()],
            relationships=tuple(
                frozendict(
                    name=name,
                    left=frozendict(
                        type_idx=collector.index(rel.left.typ),
                        field=rel.left.field,
                        cardinality=rel.left.cardinality,
                    ),
                    right=frozendict(
                        type_idx=collector.index(rel.right.typ),
                        field=rel.right.field,
                        cardinality=rel.right.cardinality,
                    ),
                )
                for name, rel in self.reg.relationships.items()
            ),
        )
        return data

    def get_type_config(self, tpe: "t.typedef") -> Dict[str, Any]:
        return utils.pick(tpe.runtime_config, "auto", "unique")

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(self.reg.managed.values())


@frozen
class PrismaMigrationRuntime(Runtime):
    runtime_name: str = always("prisma_migration")


@frozen
class PrismaApplyMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("apply")
    effect: Effect = always(effects.update())


@frozen
class PrismaDeployMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("deploy")
    effect: Effect = always(effects.update())


@frozen
class PrismaCreateMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("create")
    effect: Effect = always(effects.create())


@frozen
class PrismaDiffMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("diff")
    effect: Effect = always(effects.none())


@frozen
class PrismaResetMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("reset")
    effect: Effect = always(effects.delete())
