# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict
from typing import Iterable
from typing import List
from typing import Optional
from typing import Tuple
from typing import Union

from typegraph.graphs.typegraph import NodeProxy
from typegraph.graphs.typegraph import resolve_proxy
from typegraph.types import types as t


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

            if isinstance(field.tpe, NodeProxy):
                field.tpe = field.tpe.get()

            that_entity = field.tpe

            from typegraph.materializers.prisma import PrismaRelation

            if PrismaRelation.check(that_entity):
                if not PrismaRelation.multi(that_entity):
                    for ref_field, ref_type in that_entity.inp.props.items():
                        ref_field = f"{field_name}{ref_field.title()}"
                        self.fields[ref_field] = PrismaField(ref_field, ref_type)

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


class PrismaSchema:
    models: Dict[str, PrismaModel]

    def __init__(self, models: Iterable[Union[t.struct, NodeProxy]]):
        self.models = {}
        for model in models:
            self.models[model.name] = PrismaModel(model)

    def build(self):
        for model in self.models.values():
            model.link(self)

        from typegraph.materializers.prisma import PrismaRelation

        for model in self.models.values():
            additional_fields = {}
            for field in model.fields.values():
                if PrismaRelation.check(field.tpe):
                    relation = field.tpe.mat.relation
                    owner_type = resolve_proxy(relation.owner_type)
                    if field.tpe.mat.owner:
                        if len(relation.ids) == 0:
                            relation.ids = get_ids(owner_type)
                        for key in relation.ids:
                            field_name = f"{field.name}{key.title()}"
                            field_type = owner_type.props[key]
                            additional_fields[field_name] = PrismaField(
                                field_name, field_type
                            )
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

    from typegraph.materializers.prisma import PrismaRelation

    if PrismaRelation.check(f.tpe):
        from typegraph.materializers.prisma import Relation

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
