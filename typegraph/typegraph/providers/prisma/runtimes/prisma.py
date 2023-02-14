# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List

from attrs import frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.graph.typegraph import TypegraphContext
from typegraph.providers.prisma.schema import build_model
from typegraph.providers.prisma.type_generator import TypeGenerator
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


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


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')


# def get_inp_type(tpe: t.Type) -> t.Type:
#     if isinstance(tpe, t.func):
#         raise Exception("Invalid type")

#     if not isinstance(tpe, t.struct):
#         return tpe

#     return t.struct(
#         {k: get_inp_type(v) for k, v in tpe.of.items() if not isinstance(v, t.func)}
#     )


# def get_update_inp_type(tpe: t.Type) -> t.Type:
#     if isinstance(tpe, t.func):
#         raise Exception("Invalid type")

#     if not isinstance(tpe, t.struct):
#         return tpe

#     return t.struct(
#         {
#             k: get_inp_type(v).optional()
#             for k, v in tpe.of.items()
#             if not isinstance(v, t.func)
#         }
#     )


def get_name_generator(op_label: str, tpe: t.struct):
    return lambda name: f"{tpe.name}{op_label}{name}"


def promote_num_to_float(tpe: t.struct) -> t.struct:
    return deep_map(tpe, lambda term: t.float() if isinstance(term, t.number) else term)


def extract_number_types(tpe: t.struct) -> t.struct:
    fields = {}
    for key, value in tpe.props.items():
        if isinstance(value, t.number):
            fields[key] = value
    return t.struct(fields)


# apply fn to all terminal nodes
def deep_map(tpe: t.typedef, fn: callable) -> t.struct:
    if isinstance(tpe, t.NodeProxy):
        return deep_map(tpe.get(), fn)

    if isinstance(tpe, t.array) or isinstance(tpe, t.optional):
        content = tpe.of
        if isinstance(tpe, t.array):
            return t.array(deep_map(content, fn))
        else:
            return deep_map(content, fn).optional()

    if isinstance(tpe, t.struct):
        return t.struct({k: deep_map(v, fn) for k, v in tpe.props.items()})

    return fn(tpe)


def get_order_by_type(tpe: t.struct) -> t.struct:
    term_node_value = t.enum(["asc", "desc"]).optional()
    remap_struct = deep_map(tpe, lambda _: term_node_value).optional()
    return t.array(remap_struct)


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
    name: str
    connection_string_secret: str
    runtime_name: str = always("prisma")

    # one_to_many_relations: dict[str, OneToMany] = dataclasses.field(default_factory=dict,repr=False, hash=False, metadata={"json_serialize": False})

    # auto = {None: {t.uuid(): "auto"}}

    # No need to send this with the typegraph
    #
    # def get_type_config(self, tpe: t.typedef) -> dict:
    #     base = tpe.runtime_config
    #     config = dict()

    #     # primary key
    #     if "id" in base and base["id"]:
    #         config["id"] = True

    #     # auto generate: auto-increment (integer), random (uuid)
    #     if "auto" in base and base["auto"]:
    #         if isinstance(tpe, t.integer) or (isinstance(tpe, t.string) and tpe.format == "uuid"):
    #             config["auto"] = True

    #     return config

    @property
    def __typegen(self):
        return TypeGenerator(spec=self.spec)

    def queryRaw(self, query: str, *, effect: Effect) -> t.func:
        return t.func(
            t.struct(
                {
                    "parameters": t.json(),
                }
            ).named("QueryRawInp"),
            t.array(t.json()),
            PrismaOperationMat(self, query, "queryRaw", effect=effect),
        )

    def executeRaw(self, query: str, *, effect: Effect) -> t.func:
        return t.func(
            t.struct(
                {
                    "parameters": t.json().optional().default("[]"),
                }
            ).named(f"ExecuteRawInp_{TypegraphContext.get_active().next_type_id()}"),
            t.integer(),
            PrismaOperationMat(self, query, "executeRaw", effect=effect),
        )

    def find_unique(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Unique", tpe)
        # TODO
        # base_output = typegen.get_out_type(tpe)
        # count_ouptut = typegen.get_out_type(tpe)
        # IDEA : t.union([base_output, count_output])
        # output = either(base_output, count_output)
        return t.func(
            t.struct(
                {"where": typegen.get_where_type(tpe).named(_pref("Where")).optional()}
            ),
            typegen.get_out_type(tpe).named(_pref("Output")).optional(),
            PrismaOperationMat(self, tpe.name, "findUnique", effect=effects.none()),
        )

    def find_many(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Many", tpe)
        rel_cols = tpe.props.keys()
        # TODO
        # array_output = t.array(typegen.get_out_type(tpe)))
        # count_ouptut = typegen.get_out_type(tpe)
        # IDEA : t.union([array_output, count_output])
        # output = either(array_output, count_output)
        return t.func(
            t.struct(
                {
                    "where": typegen.get_where_type(tpe)
                    .named(_pref("Where"))
                    .optional(),
                    "orderBy": get_order_by_type(tpe)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "distinct": t.array(t.enum(rel_cols))
                    .named(_pref("Distinct"))
                    .optional(),
                }
            ),
            t.array(typegen.get_out_type(tpe).named(_pref("Output"))),
            PrismaOperationMat(self, tpe.name, "findMany", effect=effects.none()),
        )

    def aggregate(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Aggregate", tpe)
        tpe_nums = extract_number_types(tpe)
        return t.func(
            t.struct(
                {
                    "where": typegen.get_where_type(tpe)
                    .named(_pref("Where"))
                    .optional(),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                }
            ).named(_pref("Input")),
            t.struct(
                {
                    "_count": t.struct({"_all": t.integer()})
                    .compose(tpe.props)
                    .named(_pref("Count")),
                    "_avg": promote_num_to_float(tpe_nums).named(_pref("Avg")),
                    "_sum": tpe_nums.named(_pref("Sum")),
                    "_min": tpe_nums.named(_pref("Min")),
                    "_max": tpe_nums.named(_pref("Max")),
                }
            ).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "aggregate", effect=effects.none()),
        )

    def group_by(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("GroupBy", tpe)
        tpe_nums = extract_number_types(tpe)
        aggreg_def = t.struct(
            {
                "_count": t.struct({"_all": t.integer()})
                .compose(tpe.props)
                .named(_pref("Count"))
                .optional(),
                "_avg": promote_num_to_float(tpe_nums).named(_pref("Avg")).optional(),
                "_sum": tpe_nums.named(_pref("Sum")).optional(),
                "_min": tpe_nums.named(_pref("Min")).optional(),
                "_max": tpe_nums.named(_pref("Max")).optional(),
            }
        )
        row_def = aggreg_def.compose(tpe.props)
        """
        having_def = t.struct({
            col: t.struct({ agg_name: t.float().optional() for agg_name in aggreg_def.props.keys() }).optional()
            for col in tpe_nums.props.keys()
        })
        """
        having_def = t.struct(
            {"likes": t.struct({"_sum": t.struct({"equals": t.integer().optional()})})}
        ).optional()

        return t.func(
            t.struct(
                {
                    "by": t.array(t.string()).named(_pref("By")),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "where": typegen.get_where_type(row_def)
                    .named(_pref("Where"))
                    .optional(),
                    "orderBy": get_order_by_type(row_def)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "having": having_def.named(_pref("Having")).optional(),
                }
            ).named(_pref("Input")),
            t.array(row_def).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "groupBy", effect=effects.none()),
        )

    def create(self, tpe: t.struct) -> t.func:
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

    def update(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Update", tpe)
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe, update=True).named(
                        _pref("Input")
                    ),
                    "where": typegen.get_where_type(tpe).named(_pref("OneWhere")),
                }
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(
                self, tpe.name, "updateOne", effect=effects.update(True)
            ),
        )

    def delete(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Delete", tpe)
        return t.func(
            t.struct(
                {"where": typegen.get_where_type(tpe).named(_pref("Input"))},
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "deleteOne", effect=effects.delete()),
        )

    def delete_many(self, tpe: t.struct) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        return t.func(
            t.struct(
                {
                    "where": typegen.get_where_type(tpe).named(
                        f"{tpe.name}DeleteManyWhereInput"
                    ),
                }
            ),
            t.struct({"count": t.integer()}).named(f"{tpe.name}BatchDeletePayload"),
            PrismaOperationMat(self, tpe.name, "deleteMany", effect=effects.delete()),
        )

    def __manage(self, tpe):
        tpe._propagate_runtime(self)
        self.spec.manage(tpe)

    def __datamodel(self):
        models = [build_model(ty, self.spec) for ty in self.spec.types]
        return "\n\n".join(models)
        # return PrismaSchema(self.managed_types.values()).build()

    def data(self, collector: Collector) -> dict:
        data = super().data(collector)
        data["data"].update(
            datamodel=self.__datamodel(),
            connection_string_secret=self.connection_string_secret,
            models=[collector.index(tp) for tp in self.spec.types.values()],
        )
        return data

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(self.spec.types.values())

    def insert_one(self, tpe):
        return self.create(tpe)


@frozen
class PrismaMigrationRuntime(Runtime):
    runtime_name: str = always("prisma_migration")


@frozen
class PrismaApplyMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("apply")
    effect: Effect = always(effects.upsert())


@frozen
class PrismaDeployMat(Materializer):
    runtime: Runtime = PrismaMigrationRuntime()
    materializer_name: str = always("deploy")
    effect: Effect = always(effects.upsert())


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
