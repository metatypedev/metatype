# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from collections import defaultdict
from typing import DefaultDict
from typing import Dict
from typing import List
from typing import Optional
from typing import Set
from typing import Tuple
from typing import Union

from attrs import field
from attrs import frozen
from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.graph.nodes import NodeProxy
from typegraph.graph.typegraph import find
from typegraph.graph.typegraph import resolve_proxy
from typegraph.graph.typegraph import TypegraphContext
from typegraph.policies import Policy
from typegraph.providers.prisma.schema import PrismaSchema
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.base import Runtime
from typegraph.utils.attrs import always
from typegraph.utils.attrs import required
from typegraph.utils.attrs import SKIP


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


@frozen
class PrismaOperationMat(Materializer):
    runtime: "PrismaRuntime"
    table: str
    operation: str
    materializer_name: str = always("prisma_operation")
    effect: Effect = required()


@frozen
class PrismaRelation(Materializer):
    runtime: "PrismaRuntime"
    materializer_name: str = always("prisma_relation")
    relation: "Relation" = field(metadata={SKIP: True})
    owner: bool = field(metadata={SKIP: True})
    effect: Effect = always(effects.none())

    @classmethod
    def check(cls, tpe: t.typedef):
        return (
            isinstance(tpe, t.func) and tpe.mat.materializer_name == "prisma_relation"
        )

    @classmethod
    def multi(cls, tpe: t.typedef):
        return isinstance(tpe.out, t.array)

    @classmethod
    def optional(cls, tpe: t.typedef):
        return isinstance(tpe.out, t.optional)


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')


class Relation:
    runtime: "PrismaRuntime"
    owner_type: t.Type
    owned_type: t.Type
    relation: str  # TODO: name
    cardinality: str
    ids: Tuple[str, ...]

    def __init__(
        self, runtime: "PrismaRuntime", owner: t.Type, owned: t.Type, cardinality: str
    ):
        self.runtime = runtime
        self.owner_type = owner
        self.owned_type = owned
        self.relation = f"link_{owner.name}_{owned.name}"
        self.cardinality = cardinality
        self.ids = ()

    def named(self, name: str):
        self.relation = name
        return self

    def on(self, *owner_fields: str):
        self.ids = owner_fields
        return self

    def owner(self):
        return t.gen(
            self.owner_type, PrismaRelation(self.runtime, relation=self, owner=True)
        )

    def owned(self):
        if self.cardinality == "one_to_many":
            target = t.array(self.owned_type)
        elif self.cardinality == "one_to_one":
            target = t.optional(self.owned_type)
        else:
            raise unsupported_cardinality(self.cardinality)
        return t.gen(
            target,
            PrismaRelation(self.runtime, relation=self, owner=False),
        )


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


def get_input_type(
    tpe: t.struct,
    skip=set(),  # set of relation names, indicates related models to skip
    update=False,
    name: Optional[str] = None,
) -> Union[t.typedef, NodeProxy]:
    proxy = name and find(name)
    if proxy is not None:
        return proxy

    fields = {}
    if not isinstance(tpe, t.struct):
        raise Exception(f'expected a struct, got: "{type(tpe).__name__}"')
    for key, field_type in tpe.props.items():
        field_type = resolve_proxy(field_type)
        if PrismaRelation.check(field_type):
            relname = field_type.mat.relation.relation
            if relname in skip:
                continue
            mat = field_type.mat
            out = field_type.out
            if not mat.owner:
                cardinality = mat.relation.cardinality
                if cardinality == "one_to_many":
                    assert isinstance(out, t.array)
                    out = out.of
                elif cardinality == "one_to_one":
                    assert isinstance(out, t.optional)
                    out = out.of
                else:
                    raise unsupported_cardinality(cardinality)
            if isinstance(out, t.NodeProxy):
                out = out.get()
            entries = {
                "create": get_input_type(
                    out, skip=skip | {relname}, name=f"Input{out.name}Create"
                ).optional(),
                "connect": get_where_type(out, name=f"Input{out.name}").optional(),
            }
            if not mat.owner and mat.relation.cardinality == "one_to_many":
                entries["createMany"] = t.struct(
                    {"data": t.array(entries["create"].of)}
                ).optional()

            fields[key] = t.struct(entries).optional()

        elif isinstance(field_type, t.func):
            raise Exception(f'Unsupported function field "{key}"')
        else:
            if update:
                fields[key] = field_type.optional()
            else:  # create
                if field_type.runtime_config.get("auto", False):
                    fields[key] = field_type.optional()
                else:
                    fields[key] = field_type.replace()  # TODO clone

    if name is None:
        return t.struct(fields)
    else:
        return t.struct(fields).named(name)


def get_out_type(
    tpe: t.typedef, name: Optional[str] = None
) -> Union[t.typedef, NodeProxy]:
    proxy = name and find(name)
    if proxy is not None:
        return proxy

    if isinstance(tpe, t.func):
        return get_out_type(tpe.out)

    if not isinstance(tpe, t.struct):
        return tpe
    ret = t.struct({k: get_out_type(v) for k, v in tpe.props.items()})
    if name is None:
        return ret
    else:
        return ret.named(name)


def promote_num_to_float(tpe: t.struct) -> t.struct:
    fields = {}
    for key, value in tpe.props.items():
        fields[key] = t.float() if isinstance(value, t.number) else value
    return t.struct(fields)


def extract_number_types(tpe: t.struct) -> t.struct:
    fields = {}
    for key, value in tpe.props.items():
        if isinstance(value, t.number):
            fields[key] = value
    return t.struct(fields)


def deep_map(tpe: t.struct, node_value: any) -> t.struct:
    fields = {}
    for key, value in tpe.props.items():
        if isinstance(value, t.struct):
            fields[key] = deep_map(value, node_value)
        else:
            fields[key] = node_value
    return t.struct(fields)


def get_order_by_type(tpe: t.struct) -> t.struct:
    return t.array(deep_map(tpe, t.enum(["asc", "desc"]).optional()))


def get_where_type(
    tpe: t.struct, skip_rel=False, name: Optional[str] = None
) -> t.struct:
    proxy = name and find(name)
    if proxy is not None:
        return proxy

    fields = {}

    for k, v in tpe.props.items():
        if PrismaRelation.check(v):
            if skip_rel:
                continue
            v = v.out
            if isinstance(v, t.array):
                v = v.of
            if isinstance(v, t.NodeProxy):
                v = v.get()
            if isinstance(v, t.struct):
                fields[k] = get_where_type(v, skip_rel=True).optional()
            continue
        if isinstance(v, t.optional):
            v = v.of
        if isinstance(v, t.NodeProxy):
            v = v.get()
        fields[k] = v.optional()

    if name is None:
        return t.struct(fields)
    else:
        return t.struct(fields).named(name)


# TODO find a better way
managed_types: DefaultDict["PrismaRuntime", Set[t.struct]] = defaultdict(set)


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

    def gen_find_unique(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Unique", tpe)
        return t.func(
            t.struct({"where": get_where_type(tpe).named(_pref("Where")).optional()}),
            get_out_type(tpe).named(_pref("Output")).optional(),
            PrismaOperationMat(self, tpe.name, "findUnique", effect=effects.none()),
        )

    def gen_find_many(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Many", tpe)
        return t.func(
            t.struct(
                {
                    "where": get_where_type(tpe).named(_pref("Where")).optional(),
                    "orderBy": get_order_by_type(tpe)
                    .named(_pref("OrderBy"))
                    .optional(),
                }
            ),
            t.array(get_out_type(tpe).named(_pref("Output"))),
            PrismaOperationMat(self, tpe.name, "findMany", effect=effects.none()),
        )

    def gen_aggregate(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Aggregate", tpe)
        output = t.struct(
            {
                "_count": t.struct({"_all": t.integer()})
                .compose(tpe.props)
                .named(_pref("Count")),
                "take": t.integer().named(_pref("Take")),
                "skip": t.integer().named(_pref("Skip")),
                "_avg": promote_num_to_float(extract_number_types(tpe)).named(
                    _pref("Avg")
                ),
                "_sum": extract_number_types(tpe).named(_pref("Sum")),
                "_min": extract_number_types(tpe).named(_pref("Min")),
                "_max": extract_number_types(tpe).named(_pref("Max")),
            }
        )

        return t.func(
            t.struct(
                {"where": get_where_type(tpe).named(_pref("Where")).optional()}
            ).named(_pref("Input")),
            output.named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "aggregate", effect=effects.none()),
        )

    def gen_group_by(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("GroupBy", tpe)
        return t.func(
            t.struct(
                {
                    "by": t.array(t.string()).named(_pref("By")),
                    "take": t.integer().named(_pref("Take")).optional(),
                    "skip": t.integer().named(_pref("Skip")).optional(),
                    "where": get_where_type(tpe).named(_pref("Where")).optional(),
                }
            ).named(_pref("Input")),
            t.struct(
                {
                    "_count": t.struct({"_all": t.integer()})
                    .compose(tpe.props)
                    .named(_pref("Count")),
                    "_avg": promote_num_to_float(extract_number_types(tpe)).named(
                        _pref("Avg")
                    ),
                    "_sum": extract_number_types(tpe).named(_pref("Sum")),
                    "_min": extract_number_types(tpe).named(_pref("Min")),
                    "_max": extract_number_types(tpe).named(_pref("Max")),
                }
            ).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "groupBy", effect=effects.none()),
        )

    def gen_create(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Create", tpe)
        return t.func(
            t.struct(
                {
                    "data": get_input_type(tpe).named(_pref("Input")),
                }
            ),
            get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "createOne", effect=effects.create()),
        )

    def gen_update(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Update", tpe)
        return t.func(
            t.struct(
                {
                    "data": get_input_type(tpe, update=True).named(_pref("Input")),
                    "where": get_where_type(tpe).named(_pref("OneWhere")),
                }
            ),
            get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(
                self, tpe.name, "updateOne", effect=effects.update(True)
            ),
        )

    def gen_delete(self, tpe: t.struct) -> t.func:
        _pref = get_name_generator("Delete", tpe)
        return t.func(
            t.struct(
                {"where": get_where_type(tpe).named(_pref("Input"))},
            ),
            get_out_type(tpe).named(_pref("Output")),
            PrismaOperationMat(self, tpe.name, "deleteOne", effect=effects.delete()),
        )

    def gen_delete_many(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "where": get_where_type(tpe).named(
                        f"{tpe.name}DeleteManyWhereInput"
                    ),
                }
            ),
            t.struct({"count": t.integer()}).named(f"{tpe.name}BatchDeletePayload"),
            PrismaOperationMat(self, tpe.name, "deleteMany", effect=effects.delete()),
        )

    def gen(self, ops: Dict[str, Tuple[t.Type, str, Policy]]) -> Dict[str, t.func]:
        ret = {}
        for name, op in ops.items():
            tpe, op, policy = op

            if op == "findUnique":
                ret[name] = self.gen_find_unique(tpe).add_policy(policy)
            elif op == "findMany":
                ret[name] = self.gen_find_many(tpe).add_policy(policy)
            elif op == "create":
                ret[name] = self.gen_create(tpe).add_policy(policy)
            elif op == "update":
                ret[name] = self.gen_update(tpe).add_policy(policy)
            elif op == "delete":
                ret[name] = self.gen_delete(tpe).add_policy(policy)
            elif op == "deleteMany":
                ret[name] = self.gen_delete_many(tpe).add_policy(policy)
            elif op == "groupBy":
                ret[name] = self.gen_group_by(tpe).add_policy(policy)
            elif op == "aggregate":
                ret[name] = self.gen_aggregate(tpe).add_policy(policy)
            else:
                raise Exception(f'Operation not supported: "{op}"')
        # raise Exception(f'ret: {ret}')
        return ret

    def manage(self, tpe):
        if not isinstance(tpe, t.struct):
            raise Exception("cannot manage non struct")

        # what about NodeProxy?
        ids = [
            k
            for k, v in tpe.props.items()
            if isinstance(v, t.typedef)
            and not isinstance(v, t.optional)
            and v.runtime_config.get("id", False)
        ]

        if len(ids) == 0:
            non_null_fields = [
                k
                for k, v in tpe.props.items()
                if isinstance(v, t.typedef) and not isinstance(v, t.optional)
            ]
            raise Exception(
                f'{tpe.name} must have at least an id among {",".join(non_null_fields)}'
            )

        managed_types[self].add(tpe.within(self))
        return self

    def one_to_many(self, owner: t.Type, owned: t.Type):
        relation = Relation(self, owner, owned, "one_to_many")
        # TODO: relation name
        # self.one_to_many_relations[relation.relation] = relation
        return relation

    def one_to_one(self, owner: t.Type, owned: t.Type):
        relation = Relation(self, owner, owned, "one_to_one")
        return relation

    def datamodel(self):
        return PrismaSchema(managed_types[self]).build()

    def data(self, collector: Collector) -> dict:
        data = super().data(collector)
        data["data"].update(
            datamodel=self.datamodel(),
            connection_string_secret=self.connection_string_secret,
            models=[collector.index(tp) for tp in managed_types[self]],
        )
        return data

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(managed_types[self])

    # def generate_crud(self, tpe: t.struct) -> Dict[str, t.func]:
    #     tpe.materializer = self
    #     name = tpe.name.lower()
    #     return {
    #         f"{name}": t.func(sql_select(tpe), tpe, PrismaSelectMat(self)),
    #         f"update_{name}": t.func(sql_update(tpe), tpe, PrismaUpdateMat(self)),
    #         f"insert_{name}": t.func(sql_insert(tpe), tpe, PrismaInsertMat(self)),
    #         f"delete_{name}": t.func(sql_delete(tpe), tpe, PrismaDeleteMat(self)),
    #     }


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
