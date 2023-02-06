# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict
from typing import Iterable
from typing import List
from typing import Optional
from typing import Tuple
from typing import Union

from attrs import evolve
from attrs import frozen
from typegraph import types as t
from typegraph.graph.nodes import NodeProxy
from typegraph.graph.typegraph import resolve_proxy
from typegraph.providers.prisma.relations import Relation
from typegraph.providers.prisma.relations import SourceOfTruth

# from attrs import field, frozen


# https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#model-fields
prisma_types = {
    "string": "String",
    "boolean": "Boolean",
    "integer": "Int",
    # 'BigInt'
    "number": "Float",
    # 'Decimal',
    "datetime": "DateTime",
    # 'Json',
    # 'Bytes'
}


def to_prisma_string(s: str) -> str:
    return f'"{repr(s)[1:-1]}"'


def to_prisma_list(lst: List[str]) -> str:
    return f"[{', '.join(lst)}]"


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


def get_ids(tpe: t.struct) -> Tuple[str, ...]:
    return [
        k for k, v in tpe.props.items() if resolve_proxy(v).runtime_config.get("id")
    ]


class PrismaModel:
    name: str
    fields: Dict[str, PrismaField]
    entity: t.struct
    tags: List[str]

    def __init__(self, entity: t.struct) -> None:
        self.name = entity.name
        self.entity = entity
        self.fields = {}
        self.tags = []
        for field_name, field_type in entity.props.items():
            field_type = resolve_proxy(field_type)
            f = PrismaField(field_name, field_type)
            if field_type.runtime_config.get("id", False):
                f.tags.append("@id")
            if field_type.runtime_config.get("auto", False):
                if isinstance(field_type, t.integer):
                    f.tags.append("@default(autoincrement())")
                elif isinstance(field_type, t.string) and field_type._format == "uuid":
                    f.tags.append("@default(uuid())")
                else:
                    raise Exception(
                        f"auto tag is not supported for type {field_type.type}"
                    )
            self.fields[field_name] = f

    def link(self, schema: "PrismaSchema"):
        for field_name, field in list(self.fields.items()):
            # TODO resolve before PrismaSchema __init__
            # field.tpe = resolve_proxy(field.tpe)
            # that_entity = field.tpe

            # if PrismaRelation.check(that_entity):
            #     if not PrismaRelation.multi(that_entity):
            #         for ref_field, ref_type in that_entity.inp.props.items():
            #             ref_field = f"{field_name}{ref_field.title()}"
            #             self.fields[ref_field] = PrismaField(ref_field, ref_type)
            if False:
                pass
                # that_real_entity = resolve_entity_quantifier(that_entity.out)
                # that_model = schema.models[that_real_entity.node]

                # key = f"tg_{field_name}_{that_real_entity.node}"

                # if PrismaRelation.multi(that_entity):
                #     f = PrismaField(key, None)
                #     f.prisma_type = f"{self.entity.node}"
                #     these_keys = self.entity.ids().keys()
                #     those_keys = that_real_entity.ids().keys()
                #     f.tags.append(
                #         f'@relation(name: "{field_name}_{that_real_entity.node}", fields: [{", ".join(these_keys)}], references: [{", ".join(those_keys)}])'
                #     )
                #     that_model.fields[key] = f
                # elif PrismaRelation.optional(that_entity):
                #     pass
                # else:
                #     f = PrismaField(key, None)
                #     f.prisma_type = f"{self.entity.node}[]"
                #     f.tags.append(
                #         f'@relation(name: "{field_name}_{that_real_entity.node}")'
                #     )
                #     that_model.fields[key] = f


# @frozen
# class SchemaBuilder:
#     models: Dict[str, Tuple[t.struct, FieldRelation]]
#     relations: Dict[str, Relation2]

#     def __init__(self, types: Dict[str, t.struct], relations: Dict[str, Relation]):
#         self.types = types
#         self.relations = relations

#         type_relations = defaultdict(list)
#         for name, rel in relations.items():
#             type_relations[rel.owner_type.name].append(name)
#             type_relations[rel.owned_type.name].append(name)


#     def __attrs_post_init__(self):
#         for rel_name, rel in self.relations.items():
#             self.relation_by_models[rel.owner_type.name].append(rel_name)
#             self.relation_by_models[rel.owned_type.name].append(rel_name)

#     def __find_relation(self, tpe: t.struct, field_name: str) -> Optional[str]:
#         if not check_field(tpe, field_name):
#             return None

#         type_name = tpe.name
#         return next(
#             (
#                 relname
#                 for relname, relation in (
#                     (relname, self.relations[relname])
#                     for relname in self.relation_by_models[type_name]
#                 )
#                 if (
#                     relation.owner_type.name == type_name
#                     and relation.owner_field == field_name
#                 )
#                 or (
#                     relation.owned_type.name == type_name
#                     and relation.owned_field == field_name
#                 )
#             ),
#             None,
#         )

#     def build(self):
#         for model in self.models.values():


@frozen
class SchemaField:
    name: str
    typ: str
    tags: List[str]
    fkeys: List["SchemaField"] = []  # foreign keys
    fkeys_unique: bool = False

    def build(self) -> str:
        return f"{self.name} {self.typ} {' '.join(self.tags)}"


@frozen
class FieldBuilder:
    spec: SourceOfTruth

    def additional_tags(self, typ: t.typedef) -> List[str]:
        tags = []
        if typ.runtime_config.get("id", False):
            tags.append("@id")
        if typ.runtime_config.get("unique", False):
            tags.append("@unique")
        if typ.runtime_config.get("auto", False):
            if typ.type == "integer":
                tags.append("@default(autoincrement())")
            elif typ.type == "string" and typ._format == "uuid":
                tags.append("@default(uuid())")
            else:
                raise Exception(f"'auto' tag not supported for type '{typ.type}'")
        return tags

    def get_type_ids(self, typ: t.struct) -> List[str]:
        return [
            k
            for k, ty in typ.props.items()
            if resolve_proxy(ty).runtime_config.get("id", False)
        ]

    def relation(
        self, field: str, typ: t.struct, rel_name: str
    ) -> [str, List[SchemaField]]:

        references = self.get_type_ids(typ)
        fields = [f"{field}{ref.title()}" for ref in references]

        fkeys = [
            evolve(self.build(ref, typ.props[ref], typ), tags=[], name=f)
            for f, ref in zip(fields, references)
        ]

        name = to_prisma_string(rel_name)
        fields = to_prisma_list(fields)
        references = to_prisma_list(references)

        tag = f"@relation(name: {name}, fields: {fields}, references: {references})"

        return [tag, fkeys]

    def build(self, field: str, typ: t.typedef, parent_type: t.struct) -> SchemaField:
        quant = ""
        if typ.type == "optional":
            quant = "?"
            typ = resolve_proxy(typ.of)
        if typ.type == "array":
            quant = "[]"
            typ = resolve_proxy(typ.of)

        # TODO: default value

        assert typ.type not in ["optional", "array"], "Nested quantifiers not supported"

        tags = []
        fkeys = []
        fkeys_unique = False

        if isinstance(typ, t.string):
            # TODO: enum? json?
            if typ._format == "uuid":
                tags.append("@db.Uuid")  # postgres only
            if typ._format == "date":
                name = "DateTime"
            else:
                name = "String"

        elif isinstance(typ, t.boolean):
            name = "Boolean"

        elif isinstance(typ, t.integer):
            name = "Int"
        elif isinstance(typ, t.number):
            name = "Float"

        else:
            assert typ.type == "object", f"Type f'{typ.type}' not supported"
            name = typ.name

            rel = self.spec.field_relations[parent_type.name][field]
            if rel == self.spec.relations[rel.name].left:
                # left side of the relation: the one that has the foreign key defined in
                assert quant == ""
                tag, fkeys = self.relation(field, typ, rel.name)
                tags.append(tag)
                fkeys = fkeys
                fkeys_unique = rel.cardinality.is_one_to_one()
            else:
                # right side of the relation
                tags.append(f"@relation(name: {to_prisma_string(rel.name)})")
            # TODO add additional fields for the foreign keys

        tags.extend(self.additional_tags(typ))

        return SchemaField(
            name=field,
            typ=f"{name}{quant}",
            tags=tags,
            fkeys=fkeys,
            fkeys_unique=fkeys_unique,
        )


def build_model(name: str, spec: SourceOfTruth) -> str:
    fields = []

    # struct
    s = spec.types[name]

    field_builder = FieldBuilder(spec)

    tags = []

    for key, typ in s.props.items():
        typ = resolve_proxy(typ)
        if typ.runtime is not None and typ.runtime != s.runtime:
            continue
        field = field_builder.build(key, typ, s)
        fields.append(field)
        fields.extend(field.fkeys)
        if field.fkeys_unique:
            tags.append(f"@@unique({', '.join((f.name for f in field.fkeys))})")

    # TODO support for multi-field ids and indexes -- to be defined as config on the struct!!

    ids = [field.name for field in fields if "@id" in field.tags]
    assert len(ids) > 0, f"No id field defined in '{name}'"

    if len(ids) > 1:
        # multi-field id
        # ? should require declaration on the struct??
        tags.append(f"@@id([{', '.join(ids)}]")
        for field in fields:
            field.tags.remove("@id")

    # TODO process other struct-level config

    formatted_fields = "".join((f"    {f.build()}\n" for f in fields))
    formatted_tags = "".join(f"    {t}\n" for t in tags)

    return f"""model {name} {{\n{formatted_fields}\n{formatted_tags}}}\n"""


class PrismaSchema:
    models: Dict[str, PrismaModel]
    relations: Dict[str, Relation]

    def __init__(self, models: Iterable[Union[t.struct, NodeProxy]]):
        self.models = {}
        for model in models:
            self.models[model.name] = PrismaModel(model)

    def build(self):
        for model in self.models.values():
            model.link(self)

        for model in self.models.values():
            additional_fields = {}
            for field in model.fields.values():
                # if PrismaRelation.check(field.tpe):
                #     relation = field.tpe.mat.relation
                #     owner_type = resolve_proxy(relation.owner_type)
                #     if field.tpe.mat.owner:
                #         if len(relation.ids) == 0:
                #             relation.ids = get_ids(owner_type)
                #         for key in relation.ids:
                #             field_name = f"{field.name}{key.title()}"
                #             field_type = owner_type.props[key]
                #             additional_fields[field_name] = PrismaField(
                #                 field_name, field_type
                #             )
                pass
            model.fields.update(additional_fields)

            for field in model.fields.values():
                resolve(self, model, field)

        schema = ""
        for model in self.models.values():
            schema += f"model {model.name} {{\n"

            for field in model.fields.values():
                schema += f"  {field.prisma_name} {field.prisma_type} {' '.join(field.tags)}\n"

            for tag in model.tags:
                schema += f"  {tag}\n"

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

    type_name = f.tpe.type

    if isinstance(f.tpe, t.string) and f.tpe._format == "uuid":
        f.tags.append("@db.Uuid")
        f.prisma_type = "String"
        return

    if type_name in prisma_types:
        f.prisma_type = prisma_types[type_name]
        return

    if isinstance(f.tpe, t.struct):
        f.prisma_type = "Json"
        return

    from typegraph.providers.prisma.runtimes.prisma import PrismaRelation

    if PrismaRelation.check(f.tpe):
        from typegraph.providers.prisma.runtimes.prisma import Relation

        relation = f.tpe.mat.relation
        if isinstance(relation, Relation):
            if f.tpe.mat.owner:
                f.prisma_type = relation.owner_type.node
                fields = [f"{f.name}{key.title()}" for key in relation.ids]
                f.tags.append(
                    f'@relation(name: "{relation.relation}", fields: [{", ".join(fields)}], references: [{", ".join(relation.ids)}])'
                )
                if relation.cardinality == "one_to_one":
                    model.tags.append(f'@@unique({", ".join(fields)})')
            else:
                f.prisma_type = f"{relation.owned_type.node}"
                if relation.cardinality == "one_to_many":
                    f.prisma_type += "[]"
                elif relation.cardinality == "one_to_one":
                    f.prisma_type += "?"
                else:
                    raise Exception(
                        f'Unsupported relation cardinality "{relation.cardinality}"'
                    )
                # TODO: relation.name
                f.tags.append(f'@relation(name: "{relation.relation}")')
            return
        else:
            raise Exception(f'Relation "{type(relation).__name__}" not supported')

        # those_keys = f.tpe.inp.of.keys()
        # that = resolve_entity_quantifier(f.tpe.out)

        # these_keys = [f"{f.name}{nested_field.title()}" for nested_field in those_keys]

        # if PrismaRelation.multi(f.tpe):
        #     f.prisma_type = f"{that.node}[]"
        #     relation_name = f.tpe.mat.relation or f"{f.name}_{that.node}"
        #     f.tags.append(f'@relation(name: "{relation_name}")')

        # elif PrismaRelation.optional(f.tpe):
        #     f.prisma_type = f"{that.node}?"

        # else:
        #     f.prisma_type = f"{that.node}"
        #     relation_name = f.tpe.mat.relation or f"{f.name}_{that.node}"
        #     f.tags.append(
        #         f'@relation(name: "{relation_name}", fields: [{", ".join(these_keys)}], references: [{", ".join(those_keys)}])'
        #     )
        return

    if isinstance(f.tpe, t.array):
        of = f.tpe.of

        if isinstance(of, NodeProxy):
            of = of.get()
        nested = PrismaField(f.name, of)
        resolve(schema, model, nested)
        f.prisma_type = f"{nested.prisma_type}[]"
        if PrismaRelation.check(nested.tpe):
            relation_name = nested.tpe.mat.relation
            if relation_name is None:
                raise Exception("Relation name must be specified")
            f.tags.append(f'@relation(name: "{relation_name}")')
        return

    if f.tpe is None:
        return

    raise Exception(f"unhandled type {f.tpe}")
