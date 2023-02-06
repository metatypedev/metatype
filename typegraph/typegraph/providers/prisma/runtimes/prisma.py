# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from collections import defaultdict
from typing import DefaultDict
from typing import Dict
from typing import List
from typing import Optional
from typing import Union

from attrs import field
from attrs import frozen
from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node, NodeProxy
from typegraph.graph.typegraph import TypegraphContext, TypeGraph
from typegraph.providers.prisma.relations import RawLinkItem
from typegraph.providers.prisma.relations import Relation, LinkProxy
from typegraph.providers.prisma.schema import build_model
from typegraph.providers.prisma.schema import SourceOfTruth
from typegraph.providers.prisma.type_generator import TypeGenerator
from typegraph.providers.prisma.utils import resolve_entity_quantifier
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


# https://github.com/prisma/prisma-engines/tree/main/query-engine/connector-test-kit-rs/query-engine-tests/tests/queries
@frozen
class PrismaRuntime(Runtime):
    name: str
    connection_string_secret: str
    runtime_name: str = always("prisma")
    # links: DefaultDict[str, List[RawLinkItem]] = field(
    #     init=False, factory=lambda: defaultdict(list), hash=False, metadata={SKIP: True}
    # )
    spec: SourceOfTruth = field(init=False, hash=False, metadata={SKIP: True})

    def __attrs_post_init__(self):
        object.__setattr__(self, "spec", SourceOfTruth(self))

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

    def link(
        self, typ: Union[t.TypeNode, str], name: str, field: Optional[str] = None
    ) -> t.TypeNode:
        if isinstance(typ, t.typedef) or isinstance(typ, NodeProxy):
            g = typ.graph
            if isinstance(typ, t.typedef):
                typ.register_name()
            typ = typ.name
        else:
            g = TypegraphContext.get_active()
        return LinkProxy(g, typ, self, name, field)
        # self.links[name].append(RawLinkItem(typ=typ, field=field))
        # return typ

    @property
    def typegen(self):
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

    def find_unique(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
        return t.func(
            t.struct(
                {"where": typegen.get_where_type(tpe).named(f"{tpe.name}WhereUnique")}
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}UniqueOutput").optional(),
            PrismaOperationMat(self, tpe.name, "findUnique", effect=effects.none()),
        )

    def find_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
        return t.func(
            t.struct(
                {
                    "where": typegen.get_where_type(tpe)
                    .named(f"{tpe.name}Where")
                    .optional()
                }
            ),
            t.array(typegen.get_out_type(tpe).named(f"{tpe.name}Output")),
            PrismaOperationMat(self, tpe.name, "findMany", effect=effects.none()),
        )

    def create(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe).named(f"{tpe.name}CreateInput"),
                }
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}CreateOutput"),
            PrismaOperationMat(self, tpe.name, "createOne", effect=effects.create()),
        )

    def update(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
        return t.func(
            t.struct(
                {
                    "data": typegen.get_input_type(tpe, update=True).named(
                        f"{tpe.name}UpdateInput"
                    ),
                    "where": typegen.get_where_type(tpe).named(
                        f"{tpe.name}UpdateOneWhere"
                    ),
                }
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}UpdateOutput"),
            PrismaOperationMat(
                self, tpe.name, "updateOne", effect=effects.update(True)
            ),
        )

    def delete(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
        return t.func(
            t.struct(
                {"where": typegen.get_where_type(tpe).named(f"{tpe.name}DeleteInput")},
            ),
            typegen.get_out_type(tpe).named(f"{tpe.name}DeleteOutput"),
            PrismaOperationMat(self, tpe.name, "deleteOne", effect=effects.delete()),
        )

    def delete_many(self, tpe: Union[t.struct, t.NodeProxy]) -> t.func:
        self.__manage(tpe)
        typegen = self.typegen
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
        # if tpe.name in self.managed_types:
        #     return

        # if isinstance(tpe, t.NodeProxy):
        #     tg = TypegraphContext.get_active()
        #     if tg is None:
        #         raise Exception("No typegraph context")
        #     tpe = tpe.get()
        # if not isinstance(tpe, t.struct):
        #     raise Exception("cannot manage non struct types")

        # ids = [
        #     k
        #     for k, v in tpe.props.items()
        #     if isinstance(v, t.typedef)
        #     and not isinstance(v, t.optional)
        #     and v.runtime_config.get("id", False)
        # ]

        # if len(ids) == 0:
        #     non_null_fields = [
        #         k
        #         for k, v in tpe.props.items()
        #         if isinstance(v, t.typedef) and not isinstance(v, t.optional)
        #     ]
        #     raise Exception(
        #         f'{tpe.name} must have at least an id among {",".join(non_null_fields)}'
        #     )

        self.spec.manage(tpe.name)

        # self.managed_types[tpe.name] = tpe.within(self)

        # for rel_name, rel in self.__find_relations(tpe).items():
        #     self.relationships[rel_name] = rel
        #     for typ in rel.types:
        #         self.__manage(typ)

    # return the relations that involve the type
    def __find_relations(self, tpe: t.struct) -> Dict[str, Relation]:
        rels = {}
        for name, link in self.links.items():
            found = next(
                (i for i in link if resolve_entity_quantifier(i.tpe).name == tpe.name),
                None,
            )
            if found is None:
                continue
            rels[name] = Relation.from_link(name, link)

        # TODO: handle implicit relationship definitions

        # TODO check that all relationships have be defined
        # for prop_name, prop_type in tpe.props.items():
        #     prop_type = resolve_proxy(tpe)
        #     if prop_type.runtime is not None and prop_type.runtime != self:
        #         continue
        #     if isinstance(prop_type, t.struct):
        #         # `prop_type`: owner
        #         found = next((rel for rel in rels.values() if rel.owner_type.name == prop_type.name and rel.owner_field == prop_name))

        return rels

    def datamodel(self):
        models = [build_model(ty, self.spec) for ty in self.spec.types]
        return "\n\n".join(models)
        # return PrismaSchema(self.managed_types.values()).build()

    def data(self, collector: Collector) -> dict:
        data = super().data(collector)
        data["data"].update(
            datamodel=self.datamodel(),
            connection_string_secret=self.connection_string_secret,
            models=[collector.index(tp) for tp in self.spec.types.values()],
        )
        return data

    @property
    def edges(self) -> List[Node]:
        return super().edges + list(self.spec.types.values())


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
