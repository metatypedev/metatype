# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import List
from typing import Optional
from typing import Tuple

from attrs import frozen
from strenum import StrEnum
from typegraph import types as t
from typegraph.graph.typegraph import resolve_proxy
from typegraph.providers.prisma.utils import resolve_entity_quantifier


class Cardinality(StrEnum):
    ONE = "one to one"
    MANY = "one to many"


@frozen
class LinkItem:
    tpe: t.TypeNode
    # field on the other end of the link
    target_field: Optional[str]

    def resolve_proxy(self) -> "LinkItem":
        return LinkItem(resolve_proxy(self.tpe), self.target_field)


# return True iff a and b represents the same type
def test_types(a: t.TypeNode, b: t.TypeNode):
    if a.name == b.name:
        return True
    a = resolve_proxy(a)
    b = resolve_proxy(b)
    return (
        a.type == b.type
        and resolve_entity_quantifier(a).name == resolve_entity_quantifier(b).name
    )


@frozen
class Relation:
    owner_type: t.struct
    owner_field: Optional[str]
    owned_type: t.struct
    owned_field: Optional[str]
    cardinality: Cardinality

    @property
    def types(self) -> Tuple[t.struct, t.struct]:
        return (self.owner_type, self.owned_type)

    # @classmethod
    # def ensure_prop(cls, tpe: t.struct, relation_name: str, prop_type_name: str):
    #     if not isinstance(tpe, t.struct):
    #         raise Exception(
    #             f"Relationship target must be a struct, got {tpe.type} (name={tpe.name})"
    #         )
    #     for prop_type in tpe.props.values():
    #         if prop_type.runtime_config.get("rel") == prop_type_name:
    #             if prop_type.name != prop_type_name:
    #                 raise Exception(
    #                     f"Relationship target for {relation_name} required on {tpe.name}"
    #                 )

    @classmethod
    def from_link(cls, name: str, link: List[LinkItem]) -> "Relation":
        if len(link) != 2:
            raise Exception(
                f"Can only link 2 types, got: {len(link)} types for '{name}'"
            )
        link = [i.resolve_proxy() for i in link]
        owners = [i for i in link if isinstance(i.tpe, t.struct)]
        if len(owners) != 1:
            raise Exception(
                f"Link can only have one owner ('t.struct'): got {len(owners)} for '{name}'"
            )
        owner = owners[0]
        owned = next((i for i in link if i is not owner))
        assert owned is not None

        if isinstance(owned.tpe, t.optional):
            cardinality = Cardinality.ONE
        elif isinstance(owned.tpe, t.array):
            cardinality = Cardinality.MANY
        else:
            raise Exception(f"Relationship target cannot be a '{owned.type}'")

        if owner.target_field is None:
            owner_field = cls.get_reference_field(owner.tpe, owned.tpe)
        else:
            cls.check_reference_field(owner.tpe, owned.tpe, owned.target_field)
            owner_field = owned.target_field
        if owned.target_field is None:
            owned_field = cls.get_reference_field(
                resolve_proxy(resolve_entity_quantifier(owned.tpe)), owner.tpe
            )
        else:
            cls.check_reference_field(
                resolve_entity_quantifier(owned.tpe), owner.tpe, owner.target_field
            )

        return cls(
            owner_type=owner.tpe,
            owner_field=owner_field,
            owned_type=resolve_entity_quantifier(owned.tpe),
            owned_field=owned_field,
            cardinality=cardinality,
        )

    @classmethod
    def check_reference_field(
        cls, model: t.struct, referenced_type: t.TypeNode, field: str
    ):
        if not test_types(referenced_type, model.props[field]):
            raise Exception(
                f"Reference field '{field}' does not match to expected type on '{model.name}'"
            )

    @classmethod
    def get_reference_field(cls, model: t.struct, referenced_type: t.TypeNode):
        fields = [k for k, v in model.props.items() if test_types(v, referenced_type)]
        if len(fields) > 1:
            raise Exception(
                f"Link target field is required, multiple matches: {', '.join(fields)}"
            )
        if len(fields) == 0:
            raise Exception(
                f"Cannot find target field for type '{resolve_entity_quantifier(referenced_type).name}' in '{model.name}'"
            )
        return fields[0]

    # check if this relationship involve the field `field_name` of type `type_name`
    def check(self, type_name: str, field_name: str) -> bool:
        return (
            self.owner_type.name == type_name and self.owner_field == field_name
        ) or (self.owned_type.name == type_name and self.owned_field == field_name)

    def is_owner(self, type_name: str) -> bool:
        return self.owner_type.name == type_name

    def is_one_to_one(self) -> bool:
        return self.cardinality == Cardinality.ONE

    def is_one_to_many(self) -> bool:
        return self.cardinality == Cardinality.MANY

    # @classmethod
    # def create(cls, tpe: t.struct, only: Optional[str] = None) -> Dict[str, "Relation"]:
    #     res = {}

    #     def add(name: str, rel: "Relation"):
    #         if res.has(name):
    #             raise Exception(f"Duplicate relationship in type '{tpe.name}': {name}")
    #         res[name] = rel

    #     for prop_name, prop_type in tpe.props.items():
    #         prop_type = resolve_proxy(prop_type)
    #         name = prop_type.runtime_config.get("rel")
    #         if name is None:
    #             continue
    #         if only is not None and name != only:
    #             continue
    #         if isinstance(prop_type, t.optional):  # one to one
    #             wrapped_type = resolve_proxy(prop_type.item)
    #             cls.ensure_prop(wrapped_type, name, tpe.name)
    #             add(
    #                 name,
    #                 cls(
    #                     owner_type=tpe,
    #                     owned_type=prop_type,
    #                     cardinality=Cardinality.ONE,
    #                 ),
    #             )
    #         elif isinstance(prop_type, t.array):
    #             wrapped_type = resolve_proxy(prop_type.items)
    #             cls.ensure_prop(wrapped_type, name, tpe.name)
    #             add(
    #                 name,
    #                 cls(
    #                     owner_type=tpe,
    #                     owned_type=prop_type,
    #                     cardinality=Cardinality.MANY,
    #                 ),
    #             )
    #         elif isinstance(prop_type, t.struct):
    #             if only is not None:
    #                 raise Exception(
    #                     f"Relationship owned type must be a quantifier type, got '{prop_type.type}' (name={prop_type.name})"
    #                 )
    #             # recursive call; owner is `prop_type`
    #             rel = cls.create(prop_type, only=name).get(name)
    #             if rel is None:
    #                 raise Exception(
    #                     f"Relationship target missing on '{prop_type.name}' for '{name}'"
    #                 )
    #             add(name, rel)
    #         else:
    #             raise Exception(
    #                 f"Cannot set relationship on type '{prop_type.type}' (name={prop_type.name}): requires 'struct' or optional/list of 'struct'"
    #             )

    #     return res


def check_field(type: t.struct, field_name: str) -> bool:
    """Check if a field represents a relationship"""
    field_type = resolve_proxy(type.props[field_name])

    return (field_type.runtime is None or field_type.runtime == type.runtime) and (
        field_type.type == "struct"
        or resolve_proxy(resolve_entity_quantifier(field_type)).type == "struct"
    )
