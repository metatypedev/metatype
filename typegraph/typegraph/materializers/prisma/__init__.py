import dataclasses
from dataclasses import dataclass
from dataclasses import KW_ONLY
from textwrap import dedent
from typing import Dict
from typing import Set

from furl import furl
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t

from .schema import PrismaSchema
from .utils import clean_virtual_link
from .utils import only_unique
from .utils import optional_root


def comp_exp(tpe):
    name = f"bool_exp_{tpe.node}"
    return t.struct(
        {
            "_eq": t.proxy(name),
            "_gt": t.proxy(name),
            "_gte": t.proxy(name),
            "_in": t.list(t.proxy(name)),
            "_is_null": t.boolean(),
            "_lt": t.proxy(name),
            "_lte": t.proxy(name),
            "_neq": t.proxy(name),
            "_nin": t.list(t.proxy(name)),
        }
    ).named(name)


def bool_exp(tpe: t.struct):
    name = f"bool_exp_{tpe.node}"
    g = TypegraphContext.get_active()
    return t.struct(
        {
            "_and": t.list(g(name)),
            "_not": g(name),
            "_or": t.list(g(name)),
        }
    ).named(name)


def sql_select(tpe: t.struct):
    cols = tpe.of.keys()

    return t.struct(
        {
            "distinct_on": t.list(t.enum(cols)).named(f"sql_distinct_on_{tpe.node}"),
            "limit": t.unsigned_integer(),
            "offset": t.unsigned_integer(),
            "order_by": t.list(t.tuple([t.enum(cols), t.string()])).named(
                f"sql_order_by_{tpe.node}"
            ),
            "where": bool_exp(tpe).s_optional(),
        }
    )


def sql_insert(tpe: t.struct):
    return t.struct(
        {
            "objects": t.list(
                t.struct(
                    {
                        field_name: field_type
                        for field_name, field_type in tpe.of.items()
                    }
                )
            ),
        }
    )


def sql_update(tpe: t.struct):
    return t.struct(
        {
            "_set": t.struct(
                {field_name: field_type for field_name, field_type in tpe.of.items()}
            ),
            "where": bool_exp(tpe),
        }
    )


def sql_delete(tpe: t.struct):
    return t.struct({"where": bool_exp(tpe)})


@dataclass(eq=True, frozen=True)
class PrismaSelectMat(Materializer):
    runtime: "PrismaRuntime"
    _: KW_ONLY
    materializer_name: str = "prisma_select"


@dataclass(eq=True, frozen=True)
class PrismaInsertMat(Materializer):
    runtime: "PrismaRuntime"
    _: KW_ONLY
    materializer_name: str = "prisma_insert"
    serial: bool = True


@dataclass(eq=True, frozen=True)
class PrismaUpdateMat(Materializer):
    runtime: "PrismaRuntime"
    _: KW_ONLY
    materializer_name: str = "prisma_update"
    serial: bool = True


@dataclass(eq=True, frozen=True)
class PrismaRelation(Materializer):
    runtime: "PrismaRuntime"
    _: KW_ONLY
    materializer_name: str = "prisma_relation"
    relation: "Relation" = dataclasses.field(
        repr=False, hash=False, metadata={"json_serialize": False}
    )
    owner: bool = dataclasses.field(metadata={"json_serialize": False})

    @classmethod
    def check(cls, tpe: t.Type):
        return (
            isinstance(tpe, t.func)
            and tpe.mat.materializer_name == cls.materializer_name
        )

    @classmethod
    def multi(cls, tpe: t.Type):
        return isinstance(tpe.out, t.list)

    @classmethod
    def optional(cls, tpe: t.Type):
        return isinstance(tpe.out, t.optional)


@dataclass(eq=True, frozen=True)
class PrismaDeleteMat(Materializer):
    runtime: "PrismaRuntime"
    _: KW_ONLY
    materializer_name: str = "prisma_delete"
    serial: bool = True


class Relation:
    runtime: "PrismaRuntime"
    owner_type: t.Type
    owned_type: t.Type
    relation: str

    def __init__(self, runtime: "PrismaRuntime", owner: t.Type, owned: t.Type):
        self.runtime = runtime
        self.owner_type = owner
        self.owned_type = owned
        self.relation = f"link_{owner.node}_{owned.node}"

    def named(self, name: str):
        self.relation = name
        return self


class OneToMany(Relation):
    ids: tuple[str, ...] = ()

    def __init__(self, runtime: "PrismaRuntime", owner: t.Type, owned: t.Type):
        Relation.__init__(self, runtime, owner, owned)

    def on(self, *owner_fields: str):
        self.ids = owner_fields
        return self

    def owner(self):
        return t.gen(
            self.owner_type, PrismaRelation(self.runtime, relation=self, owner=True)
        )

    def owned(self):
        return t.gen(
            t.list(self.owned_type),
            PrismaRelation(self.runtime, relation=self, owner=False),
        )


# https://github.com/prisma/prisma-engines/tree/main/query-engine/connector-test-kit-rs/query-engine-tests/tests/queries
@dataclass(eq=True, frozen=True)
class PrismaRuntime(Runtime):
    connection_string: str
    _: KW_ONLY
    managed_types: Set[t.struct] = dataclasses.field(default_factory=set)
    runtime_name: str = "prisma"
    # one_to_many_relations: dict[str, OneToMany] = dataclasses.field(default_factory=dict,repr=False, hash=False, metadata={"json_serialize": False})

    # auto = {None: {t.uuid(): "auto"}}

    def queryRaw(self) -> t.func:
        return t.func(
            t.struct(
                {
                    "query": t.string(),
                    "parameters": t.json(),
                }
            ),
            t.list(t.json()),
            PrismaInsertMat(self),
        )

    def executeRaw(self) -> t.func:
        return t.func(
            t.struct(
                {
                    "query": t.string(),
                    "parameters": t.json(),
                }
            ),
            t.integer(),
            PrismaInsertMat(self),
        )

    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#createmany
    def generate_insert(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "data": clean_virtual_link(tpe),
                    "skipDuplicates": t.boolean().s_optional(),
                }
            ),
            tpe,
            PrismaInsertMat(self),
        )

    def generate_update(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "where": only_unique(tpe),
                    "data": optional_root(tpe),
                }
            ),
            tpe,
            PrismaUpdateMat(self),
        )

    def generate_delete(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "where": only_unique(tpe),
                }
            ),
            tpe,
            PrismaDeleteMat(self),
        )

    # https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#findmany
    def generate_read(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "where": t.struct(
                        {
                            k: t.struct({"equals": v.s_optional()}).s_optional()
                            for k, v in tpe.of.items()
                            if not isinstance(v, t.struct)
                            and not isinstance(v, NodeProxy)
                        }
                    ).s_optional(),
                    "take": t.integer().s_optional(),
                }
            ),
            t.list(tpe),
            PrismaSelectMat(self),
        )

    def manage(self, tpe):
        if not isinstance(tpe, t.struct):
            raise Exception("cannot manage non struct")

        if len(tpe.ids()) == 0:
            raise Exception(
                f'{tpe.node} must have at least an id among {",".join(tpe.of.keys())}'
            )

        self.managed_types.add(tpe.within(self))
        return self

    # def link(self, tpe: t.struct, *ids: str, **kwargs):
    #     if (
    #         not isinstance(tpe, t.struct)
    #         and not isinstance(tpe, t.list)
    #         and not isinstance(tpe, t.optional)
    #     ):
    #         raise Exception("cannot link non struct")

    #     target_entity = resolve_entity_quantifier(tpe)
    #     keys = {}
    #     if len(ids) == 0:
    #         keys = target_entity.ids()
    #     else:
    #         for key in ids:
    #             keys[key] = target_entity.of[key]

    #     return t.func(t.struct({name: t.injection(tpe) for name, tpe in keys.items()}), tpe, PrismaRelation(self, **kwargs))

    def one_to_many(self, owner: t.Type, owned: t.Type):
        relation = OneToMany(self, owner, owned)
        # TODO: relation name
        # self.one_to_many_relations[relation.relation] = relation
        return relation

    def datamodel(self):
        return PrismaSchema(self.managed_types).build()

    def datasource(self):
        f = furl(self.connection_string)
        source = f"""
        datasource db {{
            provider = "{f.scheme}"
            url      = "{f.url}"
        }}\n
        """
        return dedent(source)

    @property
    def data(self):
        return {
            "datamodel": self.datamodel(),
            "datasource": self.datasource(),
        }

    def generate_crud(self, tpe: t.struct) -> Dict[str, t.func]:
        tpe.materializer = self
        name = tpe.node.lower()
        return {
            f"{name}": t.func(sql_select(tpe), tpe, PrismaSelectMat(self)),
            f"update_{name}": t.func(sql_update(tpe), tpe, PrismaUpdateMat(self)),
            f"insert_{name}": t.func(sql_insert(tpe), tpe, PrismaInsertMat(self)),
            f"delete_{name}": t.func(sql_delete(tpe), tpe, PrismaDeleteMat(self)),
        }
