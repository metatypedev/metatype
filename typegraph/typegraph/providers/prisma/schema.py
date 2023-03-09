# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List, Optional, Tuple

from attrs import evolve, frozen

from typegraph import types as t
from typegraph.graph.typegraph import find, resolve_proxy
from typegraph.providers.prisma.scanner import Registry

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
    return tuple(
        k for k, v in tpe.props.items() if resolve_proxy(v).runtime_config.get("id")
    )


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
    reg: Registry

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
    ) -> Tuple[str, List[SchemaField]]:
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

        return (tag, fkeys)

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

            rel = self.reg.models[parent_type.name].get(field)
            assert rel is not None

            if rel.side_of(parent_type.name).is_left():
                # parent_side: left; has the foreign key
                tag, fkeys = self.relation(field, typ, rel.name)
                tags.append(tag)
                fkeys = fkeys  # TODO what?
                fkeys_unique = not rel.other(parent_type).cardinality.is_many()
            else:
                # parent_side: right
                tags.append(f"@relation(name: {to_prisma_string(rel.name)})")

        tags.extend(self.additional_tags(typ))

        return SchemaField(
            name=field,
            typ=f"{name}{quant}",
            tags=tags,
            fkeys=fkeys,
            fkeys_unique=fkeys_unique,
        )


def build_model(name: str) -> str:
    fields = []

    # struct
    s = find(name)

    field_builder = FieldBuilder(Registry._get_active())

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
