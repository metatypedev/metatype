# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List, Optional, Union

from attrs import field, frozen

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.graph.typegraph import TypegraphContext
from typegraph.providers.prisma.relations import LinkProxy
from typegraph.providers.prisma.schema import RelationshipRegister, build_model
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
    > A database ORM runtime.

    Attributes:
        `name`: Name of prisma runtime
        `connection_string_secret`: Name of the secret that contains the connection string
        that will be used to connect to the database

    Example:
    ```python
    with TypeGraph("prisma-runtime-example") as g:
        db = PrismaRuntime("main_db", "DB_CONNECTION")

        user = t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "email": t.email(),
            }
        )

        g.expose(
            createUser=db.create(user).add_policy(public)
        )
    ```

    ### Models

    Any `t.struct` that is passed to a generator of a `PrismaRuntime`
    defines a model.
    Models must have an ID field specified by the `"id"` config.

    Here is the list of all the available configs for model fields:

    | Config | Effect |
    |---|---|
    | `id` | defines the field ID for the model (a.k.a. primary key) |
    | `auto` | the value of this field can be auto generated; supported for `t.integer()` (auto-increment) and `t.uuid()` |
    | `unique` | make this field unique among all instances of the model |

    ### Relationships

    The `PrismaRuntime` supports two kinds of relationship between models.

    | Relationship | Field type in Model1 | Field type in Model2 |
    |---|---|---|
    |One to one| `g("Model2")` | `g("Model1").optional()` |
    |One to many| `g("Model2")` | `t.array(g("Model1"))` |

    Relationship fields must be defined on both sides of the relationship.
    A relationship is always defined for `t.struct` types and `t.optional` or
    `t.array` of `t.struct`s.

    Relatioships can also be defined implicitly using the `link` instance method
    of `PrismaRuntime`.

    Example:

    ```python
    runtime = PrismaRuntime("example", "POSTGRES")

    user = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "email": t.email().config("unique"),
            "posts": t.array(g("Post")),
        }
    ).named("User")

    post = t.struct(
        {
            "id": t.uuid().config("id", "auto"),
            "title": t.string(),
            "author": g("User"),
        }
    ).named("Post")
    ```

    ### Generators

    Generators are instance methods of `PrismaRuntime` that can be used
    to generate a `t.func` that represents a specific operation on a specific
    model of the runtime.
    They match to the model queries defined for the
    [prisma client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference).
    for the type of the input `t.struct` and the return type.

    Example:

    ```python
    with TypeGraph("prisma-runtime-example") as g:
        db = PrismaRuntime("main_db", "DB_CONNECTION")

        user = t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "email": t.email(),
            }
        )

        g.expose(
            createUser=db.create(user).add_policy(public),
            findUser=db.find_unique(user).add_policy(public),
            findManyUsers=db.find_many(user).add_policy(public),
        )
    ```

    Here is a list of all available generators:
    - `find_unique`
    - `find_many`
    - `create`
    - `update`
    - `delete`
    - `delete_many`


    """

    name: str
    connection_string_secret: str
    runtime_name: str = always("prisma")
    spec: RelationshipRegister = field(init=False, hash=False, metadata={SKIP: True})

    def __attrs_post_init__(self):
        object.__setattr__(self, "spec", RelationshipRegister(self))

    def link(
        self, typ: Union[t.TypeNode, str], name: str, field: Optional[str] = None
    ) -> t.TypeNode:
        """
        Explicitly declare a relationship between models. The return value of
        this function shall be the type of a property of a `t.struct` that
        defines a model.
        If the other end of the relationship is also defined using `link`,
        both links must have the same name.

        Arguments:
            name:     name of the relationship
            field:    name of the target field on the target model

        Example:
        ```python
        runtime = PrismaRuntime("example", "POSTGRES")

        user = t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "email": t.email().config("unique"),
                "posts": runtime.link(t.array(g("Post")), "postAuthor"),
            }
        ).named("User")

        post = t.struct(
            {
                "id": t.uuid().config("id", "auto"),
                "title": t.string(),
                "author": runtime.link(g("User"), "postAuthor"),
            }
        ).named("Post")
        ```
        """
        if isinstance(typ, t.typedef) or isinstance(typ, NodeProxy):
            g = typ.graph
            if isinstance(typ, t.typedef):
                typ.register_name()
            typ = typ.name
        else:
            g = TypegraphContext.get_active()
        return LinkProxy(g, typ, self, name, field)

    @property
    def __typegen(self):
        return TypeGenerator(spec=self.spec)

    def queryRaw(self, query: str, *, effect: Effect) -> t.func:
        """Generate a raw SQL query operation"""
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
        """Generate a raw SQL query operation without return"""
        return t.func(
            t.struct(
                {
                    "parameters": t.json().optional().default("[]"),
                }
            ).named(f"ExecuteRawInp_{TypegraphContext.get_active().next_type_id()}"),
            t.integer(),
            PrismaOperationMat(self, query, "executeRaw", effect=effect),
        )

    def find_unique(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Unique", tpe)
        # output = typegen.get_out_type(base_output)
        output = typegen.add_nested_count(tpe)
        return t.func(
            t.struct(
                {
                    "where": typegen.gen_query_where_expr(tpe)
                    .named(_pref("Where"))
                    .optional()
                }
            ),
            output.named(_pref("Output")).optional(),
            PrismaOperationMat(self, tpe.name, "findUnique", effect=effects.none()),
        )

    def find_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Many", tpe)
        rel_cols = tpe.props.keys()
        # output = typegen.get_out_type(base_output)
        output = typegen.add_nested_count(tpe)
        return t.func(
            t.struct(
                {
                    "where": typegen.gen_query_where_expr(tpe)
                    .named(_pref("Where"))
                    .optional(),
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

    def aggregate(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Aggregate", tpe)
        tpe_nums = typegen.extract_number_types(tpe)
        return t.func(
            t.struct(
                {
                    "where": typegen.gen_query_where_expr(tpe)
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
                    "_avg": typegen.promote_num_to_float(tpe_nums).named(_pref("Avg")),
                    "_sum": tpe_nums.named(_pref("Sum")),
                    "_min": tpe_nums.named(_pref("Min")),
                    "_max": tpe_nums.named(_pref("Max")),
                }
            ).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "aggregate", effect=effects.none()),
        )

    def group_by(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("GroupBy", tpe)
        tpe_nums = typegen.extract_number_types(tpe)
        aggreg_def = t.struct(
            {
                "_count": t.struct({"_all": t.integer()})
                .compose(tpe.props)
                .named(_pref("Count"))
                .optional(),
                "_avg": typegen.promote_num_to_float(tpe_nums)
                .named(_pref("Avg"))
                .optional(),
                "_sum": tpe_nums.named(_pref("Sum")).optional(),
                "_min": tpe_nums.named(_pref("Min")).optional(),
                "_max": tpe_nums.named(_pref("Max")).optional(),
            }
        )
        row_def = tpe.compose(aggreg_def.props)
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
                    "where": typegen.gen_query_where_expr(row_def)
                    .named(_pref("Where"))
                    .optional(),
                    "orderBy": typegen.get_order_by_type(row_def)
                    .named(_pref("OrderBy"))
                    .optional(),
                    "having": having_def.named(_pref("Having")).optional(),
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

    def update(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe, update=True).named(
                        f"{tpe.name}UpdateInput"
                    ),
                    "where": typegen.gen_query_where_expr(tpe).named(
                        f"{tpe.name}UpdateOneWhere"
                    ),
                }
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}UpdateOutput"),
            PrismaOperationMat(
                self, tpe.name, "updateOne", effect=effects.update(True)
            ),
        )

    def update_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("UpdateMany", tpe)
        return t.func(
            t.struct(
                {
                    "data": typegen.get_update_data_type(tpe).named(_pref("Data")),
                    "where": typegen.gen_query_where_expr(tpe).named(_pref("Where")),
                }
            ),
            t.struct({"count": t.integer()}).named(_pref("BatchPayload")),
            PrismaOperationMat(
                self, tpe.name, "updateMany", effect=effects.update(True)
            ),
        )

    def upsert(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Upsert", tpe)
        return t.func(
            t.struct(
                {
                    "where": typegen.gen_query_where_expr(tpe).named(_pref("Where")),
                    "create": typegen.get_input_type(tpe).named(_pref("Create")),
                    "update": typegen.get_update_data_type(tpe).named(_pref("Update")),
                }
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "upsertOne", effect=effects.upsert()),
        )

    def delete(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        _pref = get_name_generator("Delete", tpe)
        return t.func(
            t.struct(
                {"where": typegen.gen_query_where_expr(tpe).named(_pref("Input"))},
            ),
            typegen.get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "deleteOne", effect=effects.delete()),
        )

    def delete_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.__typegen
        return t.func(
            t.struct(
                {
                    "where": typegen.gen_query_where_expr(tpe).named(
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
        return self.gen_create(tpe)


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
