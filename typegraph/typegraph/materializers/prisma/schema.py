from typing import Dict
from typing import Iterable
from typing import List
from typing import Optional

from typegraph.graphs.typegraph import NodeProxy
from typegraph.types import typedefs as t


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
    tags: list[str]

    def __init__(self, entity: t.struct) -> None:
        self.name = entity.node
        self.entity = entity
        self.fields = {}
        self.tags = []
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

            from typegraph.materializers.prisma import PrismaRelation

            if PrismaRelation.check(that_entity):
                if not PrismaRelation.multi(that_entity):
                    for ref_field, ref_type in that_entity.inp.of.items():
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

    def __init__(self, models: Iterable[t.struct]):
        self.models = {}
        for model in models:
            self.models[model.node] = PrismaModel(model)

    def build(self):
        for model in self.models.values():
            model.link(self)

        from typegraph.materializers.prisma import PrismaRelation

        for model in self.models.values():
            additional_fields = {}
            for field in model.fields.values():
                if PrismaRelation.check(field.tpe):
                    relation = field.tpe.mat.relation
                    if field.tpe.mat.owner:
                        if len(relation.ids) == 0:
                            relation.ids = list(relation.owner_type.ids())
                        for key in relation.ids:
                            field_name = f"{field.name}{key.title()}"
                            field_type = relation.owner_type.of[key]
                            additional_fields[field_name] = PrismaField(
                                field_name, field_type
                            )
            model.fields |= additional_fields

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

    if isinstance(f.tpe, t.list):
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
