import dataclasses
from dataclasses import dataclass
from dataclasses import KW_ONLY
from textwrap import dedent
from typing import Dict
from typing import Iterable
from typing import List
from typing import Optional
from typing import Set

from furl import furl
from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import TypegraphContext
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
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


# https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#model-fields
prisma_types = {
    "string": "String",
    "boolean": "Boolean",
    "integer": "Int",
    # 'BigInt'
    "float": "Float",
    # 'Decimal',
    "datetime": "DateTime",
    # 'Json',
    # 'Bytes'
}


class PrismaField:
    name: str
    tpe: t.Type
    prisma_name: str
    prisma_type: Optional[str]
    tags: List[str]

    def __init__(self, name: str, tpe: t.Type):
        self.name = name
        self.tpe = tpe
        self.prisma_name = name
        self.prisma_type = None
        self.tags = []


class PrismaModel:
    name: str
    fields: Dict[str, PrismaField]
    entity: t.struct

    def __init__(self, entity: t.struct) -> None:
        self.name = entity.node
        self.entity = entity
        self.fields = {}
        for field_name, field_type in entity.of.items():
            f = PrismaField(field_name, field_type)
            if field_type._id:
                f.tags.append("@id")
            self.fields[field_name] = f

    def link(self, schema: "PrismaSchema"):
        for field_name, field in list(self.fields.items()):

            if isinstance(field.tpe, NodeProxy):
                field.tpe = field.tpe.get()

            that_entity = field.tpe

            if PrismaRelation.check(that_entity):
                if not PrismaRelation.multi(that_entity):
                    for ref_field, ref_type in that_entity.inp.of.items():
                        ref_field = f"{field_name}_{ref_field}"
                        self.fields[ref_field] = PrismaField(ref_field, ref_type)

                that_real_entity = resolve_entity_quantifier(that_entity.out)
                that_model = schema.models[that_real_entity.node]

                key = f"tg_{field_name}_{that_real_entity.node}"

                if PrismaRelation.multi(that_entity):
                    f = PrismaField(key, None)
                    f.prisma_type = f"{self.entity.node}"
                    these_keys = self.entity.ids().keys()
                    those_keys = that_real_entity.ids().keys()
                    f.tags.append(
                        f'@relation(name: "{field_name}_{that_real_entity.node}", fields: [{", ".join(these_keys)}], references: [{", ".join(those_keys)}])'
                    )
                    that_model.fields[key] = f
                elif PrismaRelation.optional(that_entity):
                    pass
                else:
                    f = PrismaField(key, None)
                    f.prisma_type = f"{self.entity.node}[]"
                    f.tags.append(
                        f'@relation(name: "{field_name}_{that_real_entity.node}")'
                    )
                    that_model.fields[key] = f


class PrismaSchema:
    models: Dict[str, PrismaModel]

    def __init__(self, models: Iterable[t.struct]):
        self.models = {}
        for model in models:
            self.models[model.node] = PrismaModel(model)

    def build(self):
        for model in self.models.values():
            model.link(self)

        for model in self.models.values():
            for field in model.fields.values():
                resolve(self, model, field)

        schema = ""
        for model in self.models.values():
            schema += f"model {model.name} {{\n"

            for field in model.fields.values():
                schema += f"  {field.prisma_name} {field.prisma_type} {' '.join(field.tags)}\n"

            schema += "}\n\n"
        return schema


def resolve(schema: PrismaSchema, model: PrismaModel, f: PrismaField):

    if isinstance(f.tpe, NodeProxy):
        f.tpe = f.tpe.get()
        return resolve(schema, model, f)

    if isinstance(f.tpe, t.optional):
        nested = PrismaField(f.prisma_name, f.tpe.of)
        resolve(schema, model, nested)
        f.prisma_type = f"{nested.prisma_type}?"
        return

    typedef = type(f.tpe).__name__

    if typedef == "uuid":
        f.tags.append("@db.Uuid")
        f.prisma_type = "String"
        return

    if typedef in prisma_types:
        f.prisma_type = prisma_types[typedef]
        return

    if isinstance(f.tpe, t.struct):
        f.prisma_type = "Json"
        return

    if PrismaRelation.check(f.tpe):
        those_keys = f.tpe.inp.of.keys()
        that = resolve_entity_quantifier(f.tpe.out)

        these_keys = [f"{f.name}_{nested_field}" for nested_field in those_keys]

        if PrismaRelation.multi(f.tpe):
            f.prisma_type = f"{that.node}[]"
            f.tags.append(f'@relation(name: "{f.name}_{that.node}")')

        elif PrismaRelation.optional(f.tpe):
            f.prisma_type = f"{that.node}?"

        else:
            f.prisma_type = f"{that.node}"
            f.tags.append(
                f'@relation(name: "{f.name}_{that.node}", fields: [{", ".join(these_keys)}], references: [{", ".join(those_keys)}])'
            )
        return

    if isinstance(f.tpe, t.list):
        of = f.tpe.of

        nested = PrismaField(f.name, of)
        f.prisma_type = f"{nested.prisma_type}[]"
        return

    if f.tpe is None:
        return

    raise Exception(f"unhandled type {f.tpe}")


def resolve_entity_quantifier(tpe: t.Type):
    if isinstance(tpe, t.list):
        return tpe.of
    if isinstance(tpe, t.optional):
        return tpe.of
    return tpe


def clean_virtual_link(tpe: t.Type):

    if isinstance(tpe, t.struct):
        ret = {}
        # renames = {}
        for k, v in tpe.of.items():

            if isinstance(v, NodeProxy):
                v = v.get()

            if isinstance(v, t.func):
                if isinstance(v.out, t.list) and isinstance(v.out.of, t.struct):
                    continue

                # ids = v.inp.of.keys()
                # key = "_".join(ids)
                # if len(ids) <= 1:
                #    key = f"{k}_{key}"
                # renames[k] = key

                out = clean_virtual_link(v.out)
                ret[k] = t.struct(
                    {
                        "create": out.s_optional(),
                        "createMany": t.struct({"data": t.list(out)}).s_optional(),
                        "connect": out.s_optional(),
                        "connectOrCreate": t.struct(
                            {
                                # "where":
                                "create": out,
                            }
                        ).s_optional(),
                    }
                )
            else:
                ret[k] = clean_virtual_link(v)

        ret = t.struct(ret)
        # ret.renames = renames
        return ret

    return tpe


def only_unique(tpe: t.Type):
    if isinstance(tpe, t.struct):
        return t.struct({k: only_unique(v) for k, v in tpe.ids().items()})
    return tpe


def optional_root(tpe: t.struct):
    return t.struct({k: v.s_optional() for k, v in tpe.of.items()})


# https://github.com/prisma/prisma-engines/tree/main/query-engine/connector-test-kit-rs/query-engine-tests/tests/queries
@dataclass(eq=True, frozen=True)
class PrismaRuntime(Runtime):
    connection_string: str
    _: KW_ONLY
    managed_types: Set[t.struct] = dataclasses.field(default_factory=set)
    runtime_name: str = "prisma"

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

    def link(self, tpe: t.struct, *ids: str):
        if (
            not isinstance(tpe, t.struct)
            and not isinstance(tpe, t.list)
            and not isinstance(tpe, t.optional)
        ):
            raise Exception("cannot link non struct")

        target_entity = resolve_entity_quantifier(tpe)
        keys = {}
        if len(ids) == 0:
            keys = target_entity.ids()
        else:
            for key in ids:
                keys[key] = target_entity.of[key]

        return t.func(t.struct(keys), tpe, PrismaRelation(self))

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
