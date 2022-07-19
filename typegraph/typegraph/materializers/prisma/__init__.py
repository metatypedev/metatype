import dataclasses
from dataclasses import dataclass
from dataclasses import KW_ONLY
from textwrap import dedent
from typing import Set

from furl import furl
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.materializers.prisma.schema import PrismaSchema
from typegraph.types import typedefs as t


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
class PrismaOperationMat(Materializer):
    runtime: "PrismaRuntime"
    table: str
    operation: str
    _: KW_ONLY
    materializer_name: str = "prisma_operation"
    serial: bool = False


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
    cardinality: str

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
        self.cardinality = "one_to_many"

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


def get_inp_type(tpe: t.Type) -> t.Type:
    if isinstance(tpe, t.func):
        raise Exception("Invalid type")

    if not isinstance(tpe, t.struct):
        return tpe

    return t.struct(
        {k: get_inp_type(v) for k, v in tpe.of.items() if not isinstance(v, t.func)}
    )


def get_update_inp_type(tpe: t.Type) -> t.Type:
    if isinstance(tpe, t.func):
        raise Exception("Invalid type")

    if not isinstance(tpe, t.struct):
        return tpe

    return t.struct(
        {
            k: get_inp_type(v).s_optional()
            for k, v in tpe.of.items()
            if not isinstance(v, t.func)
        }
    )


def get_create_input_type(tpe: t.struct, skip_relations=False) -> t.Type:
    fields = {}
    for key, field_type in tpe.of.items():
        if PrismaRelation.check(field_type):
            if skip_relations:
                continue
            mat = field_type.mat
            out = field_type.out
            if not mat.owner and mat.relation.cardinality == "one_to_many":
                assert isinstance(out, t.list)
                out = out.of
            entries = {
                "create": get_create_input_type(out, skip_relations=True)
                .named(f"Input{out.node}Create")
                .s_optional(),
                "connect": get_where_type(out).named(f"Input{out.node}").s_optional(),
            }
            if not mat.owner and mat.relation.cardinality == "one_to_many":
                entries["createMany"] = t.struct(
                    {"data": t.list(entries["create"].of)}
                ).s_optional()

            fields[key] = t.struct(entries)

        elif isinstance(field_type, t.list) and not isinstance(field_type, t.string):
            continue
        else:
            fields[key] = field_type
    return t.struct(fields)


def get_out_type(tpe: t.Type) -> t.Type:
    if isinstance(tpe, t.func):
        return get_out_type(tpe.out)

    if not isinstance(tpe, t.struct):
        return tpe

    return t.struct({k: get_out_type(v) for k, v in tpe.of.items()})


def get_where_type(tpe: t.struct, skip_rel=False) -> t.struct:
    fields = {}

    for k, v in tpe.of.items():
        if PrismaRelation.check(v):
            if skip_rel:
                continue
            v = v.out
            if isinstance(v, t.list):
                v = v.of
            if isinstance(v, t.NodeProxy):
                v = v.get()
            if isinstance(v, t.struct):
                fields[k] = get_where_type(v, skip_rel=True).s_optional()
            continue
        if isinstance(v, t.optional):
            v = v.of
        if isinstance(v, t.NodeProxy):
            v = v.get()
        fields[k] = v.s_optional()

    return t.struct(fields)


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
            ).named("QueryRawInp"),
            t.list(t.json()),
            PrismaOperationMat(self, "", "queryRaw"),
        )

    def executeRaw(self) -> t.func:
        return t.func(
            t.struct(
                {
                    "query": t.string(),
                    "parameters": t.json(),
                }
            ).named("ExecuteRawInp"),
            t.integer(),
            PrismaOperationMat(self, "", "executeRaw", serial=True),
        )

    def gen_find_unique(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct({"where": get_where_type(tpe).named(f"{tpe.node}WhereUnique")}),
            get_out_type(tpe).named(f"{tpe.node}UniqueOutput").s_optional(),
            PrismaOperationMat(self, tpe.node, "findUnique"),
        )

    def gen_find_many(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {"where": get_where_type(tpe).named(f"{tpe.node}Where").s_optional()}
            ),
            t.list(get_out_type(tpe).named(f"{tpe.node}Output")),
            PrismaOperationMat(self, tpe.node, "findMany"),
        )

    def gen_create(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "data": get_create_input_type(tpe).named(f"{tpe.node}CreateInput"),
                }
            ),
            get_out_type(tpe).named(f"{tpe.node}CreateOutput"),
            PrismaOperationMat(self, tpe.node, "createOne", serial=True),
        )

    def gen_update(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {
                    "data": get_update_inp_type(tpe).named(f"{tpe.node}UpdateInput"),
                    "where": get_where_type(tpe).named(f"{tpe.node}UpdateOneWhere"),
                }
            ),
            get_out_type(tpe).named(f"{tpe.node}UpdateOutput"),
            PrismaOperationMat(self, tpe.node, "updateOne", serial=True),
        )

    def gen_delete(self, tpe: t.struct) -> t.func:
        return t.func(
            t.struct(
                {"where": get_where_type(tpe).named(f"{tpe.node}DeleteInput")},
            ),
            get_out_type(tpe).named(f"{tpe.node}DeleteOutput"),
            PrismaOperationMat(self, tpe.node, "deleteOne", serial=True),
        )

    def gen(self, ops: dict[str, tuple[t.Type, str, t.policy]]) -> dict[str, t.func]:
        ret = {}
        for name, op in ops.items():
            tpe, op, policy = op
            match op:
                case "findUnique":
                    ret[name] = self.gen_find_unique(tpe).add_policy(policy)
                case "findMany":
                    ret[name] = self.gen_find_many(tpe).add_policy(policy)
                case "create":
                    ret[name] = self.gen_create(tpe).add_policy(policy)
                case "update":
                    ret[name] = self.gen_update(tpe).add_policy(policy)
                case "delete":
                    ret[name] = self.gen_delete(tpe).add_policy(policy)
                case "queryRaw":
                    ret[name] = self.queryRaw().add_policy(policy)
                case "executeRaw":
                    ret[name] = self.executeRaw().add_policy(policy)
                case _:
                    raise Exception(f'Operation not supported: "{op}"')
        return ret

    def manage(self, tpe):
        if not isinstance(tpe, t.struct):
            raise Exception("cannot manage non struct")

        if len(tpe.ids()) == 0:
            raise Exception(
                f'{tpe.node} must have at least an id among {",".join(tpe.of.keys())}'
            )

        self.managed_types.add(tpe.within(self))
        return self

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

    # def generate_crud(self, tpe: t.struct) -> Dict[str, t.func]:
    #     tpe.materializer = self
    #     name = tpe.node.lower()
    #     return {
    #         f"{name}": t.func(sql_select(tpe), tpe, PrismaSelectMat(self)),
    #         f"update_{name}": t.func(sql_update(tpe), tpe, PrismaUpdateMat(self)),
    #         f"insert_{name}": t.func(sql_insert(tpe), tpe, PrismaInsertMat(self)),
    #         f"delete_{name}": t.func(sql_delete(tpe), tpe, PrismaDeleteMat(self)),
    #     }
