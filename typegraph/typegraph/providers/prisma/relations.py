# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


"""



"""


from collections import defaultdict
from typing import Callable
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple
from typing import TYPE_CHECKING

from attrs import evolve
from attrs import frozen
from strenum import StrEnum
from typegraph import types as t
from typegraph.graph.typegraph import find, TypeGraph
from typegraph.graph.nodes import NodeProxy
from typegraph.graph.typegraph import resolve_proxy
from typegraph.providers.prisma.utils import resolve_entity_quantifier

if TYPE_CHECKING:
    from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


class LinkProxy(NodeProxy):
    runtime: "PrismaRuntime"
    link_name: str
    target_field: Optional[str]

    def __init__(
        self,
        g: TypeGraph,
        node: str,
        runtime: "PrismaRuntime",
        link_name: str,
        target_field: Optional[str],
    ):
        super().__init__(g, node)
        self.runtime = runtime
        self.link_name = link_name
        self.target_field = target_field


class Cardinality(StrEnum):
    ONE = "one to one"
    MANY = "one to many"

    def is_one_to_one(self):
        return self == Cardinality.ONE

    def is_one_to_many(self):
        return self == Cardinality.MANY


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
        field_type.type == "object"
        or resolve_proxy(resolve_entity_quantifier(field_type)).type == "object"
    )


@frozen
class RawLinkItem:
    typ: t.typedef
    field: Optional[str]


class Side(StrEnum):
    """
    A relationship is defined between two models:
    - the "owner", on the "left" side of the relationship, has the foreign key
    - the "ownee", on the "right" side of the relationship
    """

    LEFT = "left"
    RIGHT = "right"

    def is_left(self):
        return self == Side.LEFT

    def is_right(self):
        return self == Side.RIGHT


@frozen
class FieldRelation:
    name: str
    typ: t.struct
    field: str
    cardinality: Cardinality
    side: Side


@frozen
class Relation2:
    left: FieldRelation
    right: FieldRelation

    def __attrs_post_init__(self):
        assert (
            self.left.cardinality == self.right.cardinality
        ), f"left and right sides of a relationship must have the same cardinality"

    @property
    def name(self):
        return self.left.name

    @property
    def left_type_name(self):
        return self.left.typ.name

    @property
    def right_type_name(self):
        return self.right.typ.name

    def side_of(self, type_name: str) -> Optional[Side]:
        if self.left_type_name == type_name:
            return Side.LEFT
        if self.right_type_name == type_name:
            return Side.RIGHT
        return None

    @property
    def cardinality(self):
        return self.right.cardinality


class SourceOfTruth:
    runtime: "PrismaRuntime"
    types: Dict[str, t.struct]
    field_relations: Dict[str, Dict[str, FieldRelation]]
    relations: Dict[str, Relation2]

    def __init__(self, runtime):
        self.runtime = runtime
        self.types = {}
        self.field_relations = defaultdict(dict)
        self.relations = {}

    def get_left_proxy(self, left_field: str, right: LinkProxy) -> LinkProxy:
        right_type = resolve_proxy(resolve_entity_quantifier(right.get()))
        prop_type = right_type.props[right.target_field]
        if isinstance(prop_type, LinkProxy):
            left = prop_type
            assert left.link_name == right.link_name
            left_type = left.get()
            assert left_type.type == "object", f"Expected object, got {left_type.type}"

            if left.target_field is not None:
                assert left.target_field == left_field
            else:
                left.target_field = left_field

            return left
                # match by target_field
                # right_type = right.get()
                # target_type = resolve_proxy(typ.props[left.target_field])
                # assert (
                #     right_type.type == target_type.type
                #     and resolve_entity_quantifier(right_type).name
                #     == resolve_entity_quantifer(target_type).name
                # )
                # return left

            # # find left.target_field
            # right_type = resolve_proxy(resolve_entity_quantifier(right.get()))
            # # we should find typ (the same reference) in right_type
            # fields = [f for f, ty in right_type.props.items() if ty == typ]
            # assert len(fields) == 1
            # left.target_field = fields[0]
            # return left

        raise Exception("Not supported (yet)")
        # we need to wrap `typ` in a LinkProxy

        right_type_wrapper = right.get()  # optional or array
        right_type = resolve_proxy(resolve_entity_quantifier(right_type_wrapper))

        # find matching field in right_type
        fields = [f for f, ty in right_type.props.items() if ty.name == typ.name]
        assert len(fields) == 1
        return self.runtime.link(typ, right.link_name, fields[0])

    def get_right_proxy(self, right_field: str, left: LinkProxy) -> LinkProxy:
        left_type = left.get()
        prop_type = left_type.props[left.target_field]
        if isinstance(prop_type, LinkProxy):
            right = prop_type
            assert left.link_name == right.link_name
            assert right.get().type in ["optional", "array"]
            if right.target_field is not None:
                assert right.target_field == right_field
            else:
                right.target_field = right_field

            return right

            # find right.target_field
            # we should find typ (the same reference) in left_type
            fields = [f for f, ty in left_type.props.items() if ty == typ]
            assert len(fields) == 1
            right.target_field = fields[0]
            return right

        raise Exception("Not supported (yet)")

        # we need to wrap `typ` in a LinkProxy
        # find matching field in left_type
        right_type_wrapper = resolve_proxy(typ)
        right_type = resolve_proxy(resolve_entity_quantifier(right_type_wrapper))
        fields = [
            f
            for f, ty in left_type.props.items()
            if ty.type == right_type_wrapper.type
            and resolve_entity_quantifier(ty).name == right_type.name
        ]
        assert len(fields) == 1
        return self.runtime.link(typ, left.link_name, fields[0])

    # TODO return a list instead; there could be more than one?
    # get (left, right) LinkProxy's for a relationship
    def get_relationship(
        self, from_type: t.TypeNode, target_type: t.struct, from_field: str
    ) -> Optional[Tuple[LinkProxy, LinkProxy]]:
        link1 = None
        link2 = None
        if isinstance(from_type, LinkProxy):
            link1 = from_type
            from_type = from_type.get()

            if from_type.type in ["optional", "array"]:
                right = link1
                if right.target_field is None:
                    right_type = resolve_proxy(resolve_entity_quantifier(right.get()))
                    # TODO
                    fields = [
                        f 
                        for f, ty in right_type.props.items()
                        if isinstance(ty, LinkProxy) and ty.link_name == right.link_name
                    ]
                    assert len(fields) == 1
                    right.target_field = fields[0]

                left_field = from_field
                left = self.get_left_proxy(left_field, right)
                return left, right

            assert from_type.type == "object"
            left = link1
            if left.target_field is None:
                left_type = left.get()
                fields = [
                    f
                    for f, ty in left_type.props.items()
                    if isinstance(ty, LinkProxy) and ty.link_name == left.link_name
                ]
                assert len(fields) == 1
                left.target_field = fields[0]

            right_field = from_field
            right = self.get_right_proxy(right_field, left)
            return left, right

            if link1.target_field is not None:
                # assert link1.target_field == from_field
                # left or right ?
                if from_type.type in ["optional", "array"]:  # right
                    right = link1
                    # left_type = target_type
                    left_field = from_field
                    left = self.get_left_link(left_field, right)
                    return left, right

                # left
                assert from_type.type == "object"
                left = link1
                # right_type = target_type
                right_field = from_field
                right = self.get_right_proxy(right_field, left)
                return left, right

            # find link1.target_field
            if from_type.type in ["optional", "array"]:  # right
                print(f"from_type: {from_type.name}")
                right = link1
                nested_type = resolve_proxy(resolve_entity_quantifier(from_type))
                # fields = [f for f, ty in nested_types.props.items() if ty.name = target_type.name]
                fields = [
                    f
                    for f, ty in nested_type.props.items()
                    if isinstance(ty, LinkProxy) and ty.link_name == link1.link_name
                ]
                assert len(fields) == 1
                right.target_field = fields[0]
                print(f"target type={target_type.name}, target_field={from_field}")
                left = self.get_left_link(target_type.props[from_field], right)
            else:
                left = link1
                fields = [
                    f
                    for f, ty in from_type.props.items()
                    if isinstance(ty, LinkProxy) and ty.link_name == link1.link_name
                ]
                assert len(fields) == 1
                left.target_field = fields[0]
                right = self.get_right_link(target_type.props[from_field], left)

            return left, right

        else:
            raise Exception("not supported (yet)")
            from_type = resolve_proxy(from_type)

        return None

        if from_type.type in ["optional", "array"]:
            nested_type = resolve_proxy(resolve_entity_quantifier(from_type))
            if nested_type.type != "object":
                return None
            right = nested_type
            left = target_type

            fields = []

            fields = [name for name, ty in right.props.items() if ty.name == left.name]
            link_fields = [
                name for name in fields if isinstance(right.props[name], LinkProxy)
            ]

            if link1:
                link_fields = [
                    name
                    for name in link_links
                    if right.props[name].link_name == link1.name
                ]
                assert len(link_fields) < 2
                link1.target_field = next(iter(link_fields))
                if link1.target_field is not None:
                    # match by name
                    link2 = right.props[link1.target_field]
                    assert link2.get().type == "object"
                    if link2.target_field is not None:
                        assert link2.target_field == from_field
                    else:
                        link2.target_field == from_field
                    return link2, link1

            # if link1 and link1.link_name in [link.name for link in links]:
            # for name, ty in right.props.items():

    # return a LinkProxy if field `typ` defines a relationship
    def get_link_proxy(
        self, from_type: t.typedef, target_type: t.struct
    ) -> Optional[LinkProxy]:
        return None
        if from_type.type in ["optional", "array"]:
            nested_type = resolve_proxy(resolve_entity_quantifier)
            if nested_type.type != "object":  # not `t.struct`
                return None

            right = nested_type
            left = target_type

            # TODO not necessarily unique if the context is clear:
            # The target type should have:
            # - a LinkProxy targetting the current field; or
            # - a LinkProxy targetting targetting the current type and
            #   no other field on the current type matches to the relationship requirements.
            # TODO: def find_relationship_target_field(on: t.struct, target: t.struct)
            target_field = find_unique_prop(
                nested_type,
                lambda ty: ty.name == target_type.name,
                f"Field of type '{target_type.name}'",
            )

        else:
            if from_type.type != "object":
                return None

            left = from_type
            right = target_type

            # TODO not necessarily unique if the context is clear: see supra
            target_field = find_unique_prop(
                from_type,
                lambda ty: ty.type in ["optional", "array"]
                and ty.of.name == target_type.name,
                f"Field of type: array/optional of '{target_type.name}'",
            )

        link_name = f"__{left.name}_to_{right.name}"
        return self.link(from_type, link_name, target_field)

    def manage(self, typ: t.struct):
        if typ.name in self.types:
            return

        assert typ.type == "object", f"Prisma cannot manage '{typ.type}' types'"
        self.types[typ.name] = typ

        deps = []

        for prop_name, prop_type in typ.props.items():
            if not isinstance(prop_type, LinkProxy):
                prop_type = resolve_proxy(prop_type)
                prop_type = self.get_link_proxy(prop_type, typ)
                if prop_type is None:
                    print(f"no link proxy for {typ.name}::{prop_name}")
                    continue  # not a relationship field

            links = self.get_relationship(prop_type, typ, prop_name)
            print(f"no relationship for {typ.name}::{prop_name}")
            if links is None:
                continue
            left_proxy, right_proxy = links
            left_type = left_proxy.get()
            right_type = resolve_proxy(resolve_entity_quantifier(right_proxy.get()))

            print(f"left type: {left_type.name}, right type: {right_type.name}")
            print(f"left field: {left_proxy.target_field}, right field: {right_proxy.target_field}")

            deps.append(left_type)
            deps.append(right_type)

            cardinality, q = (
                (Cardinality.ONE, "?")
                if right_proxy.get().type == "optional"
                else (Cardinality.MANY, "[]")
            )
            relname = left_proxy.link_name

            rel = Relation2(
                left=FieldRelation(
                    name=relname,
                    typ=left_type,
                    field=right_proxy.target_field,
                    cardinality=cardinality,
                    side=Side.LEFT,
                ),
                right=FieldRelation(
                    name=relname,
                    typ=right_type,
                    field=left_proxy.target_field,
                    cardinality=cardinality,
                    side=Side.RIGHT,
                ),
            )

            self.field_relations[left_type.name][left_proxy.target_field] = rel.right
            self.field_relations[right_type.name][right_proxy.target_field] = rel.left
            self.relations[relname] = rel

            # else:
            #     # check target field
            #     p = self.get_link_proxy(prop_type.get(), typ)
            #     assert p is not None
            #     if prop_type.target_field is not None:
            #         # prop_type.target_field = find_relationship_target_field(prop_type.get(), typ)
            #         prop_type.target_field = p.target_field
            #     else:
            #         # check_relationship_target_field(prop_type.get(), typ, prop_type.target_field)
            #         assert prop_type.target_field == p.target_field

            # left_field = left_type.target_field
            # right_field = right_type.target_field

            # left_type = prop_type.get()
            # right_type = prop_type.get()

            # if left_type.type != "object":
            #     assert right_type.type == "object"
            #     queue.append(right_type)
            #     left_type, right_type = right_type, left_type
            # else:
            #     queue.append(resolve_proxy(resolve_entity_quantifier(right_type)))

            # assert right_type.type in [
            #     "optional",
            #     "array",
            # ], "Right side type must be a quantifier"

            # cardinality = (
            #     Cardinality.ONE if right_type.type == "optional" else Cardinality.MANY
            # )

            # right_type = resolve_proxy(resolve_entity_quantifier(right_type)).within(
            #     self.runtime
            # )

            # assert (
            #     right_type.type == "object"
            # ), f"Right type must be an array/optional of 'object', got: '{right_type.type}'"

            # q = "?" if cardinality.is_one_to_one() else "[]"

            # if left.field is None:
            #     left = evolve(
            #         left,
            #         field=find_unique_prop(
            #             left_type,
            #             lambda ty: ty.type == right.typ.type
            #             and ty.of.name == right_type.name,
            #             f"Field of type '{right_type.name}{q}'",
            #         ),
            #     )
            # if right.field is None:
            #     right = evolve(
            #         right,
            #         field=find_unique_prop(
            #             right_type,
            #             lambda ty: ty.name == left_type.name,
            #             f"Field of type '{left_type.name}'",
            #         ),
            #     )

            # rel = Relation2(
            #     left=FieldRelation(
            #         name=rel_name,
            #         typ=left_type,
            #         field=left.field,
            #         cardinality=cardinality,
            #         side=Side.LEFT,
            #     ),
            #     right=FieldRelation(
            #         name=rel_name,
            #         typ=right_type,
            #         field=right.field,
            #         cardinality=cardinality,
            #         side=Side.RIGHT,
            #     ),
            # )

            # self.types[left_type.name] = left_type
            # self.types[right_type.name] = right_type
            # self.field_relations[left_type.name][left.field] = rel.right
            # self.field_relations[right_type.name][right.field] = rel.left
            # self.relations[rel_name] = rel

        for ty in deps:
            self.manage(ty)


# find the unique property of the struct that satisfies the given test
def find_unique_prop(
    s: t.struct, test: Callable[[t.typedef], bool], context: str
) -> str:
    found = []
    for key, typ in s.props.items():
        if test(resolve_proxy(typ)):
            found.append(key)

    if len(found) == 0:
        raise Exception(f"{context}: not found in '{s.name}'")
    if len(found) > 1:
        raise Exception(f"{context}: found more than one in '{s.name}'")

    return found[0]
