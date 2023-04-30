# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from collections import defaultdict

from attr import field
from typegraph import t, TypeGraph
from attrs import define, frozen
from typing import Any, Optional, Tuple, List, Dict
from enum import auto
from strenum import StrEnum
from typegraph.graph.nodes import NodeProxy

from typegraph.graph.typegraph import resolve_proxy
from typegraph.types import TypeNode


class LinkProxy(NodeProxy):
    rel_name: Optional[str]
    fkey: Optional[bool]
    target_field: Optional[str]

    def __init__(
        self,
        g: TypeGraph,
        node: str,
        *,
        rel_name: Optional[str] = None,
        fkey: Optional[bool] = None,
        field: Optional[str] = None,
    ):
        super().__init__(g, node)
        self.rel_name = rel_name
        self.fkey = fkey
        self.target_field = field


_ModelName = str
_PropertyName = str
_RelationshipName = str
_ModelRelationships = Dict[_PropertyName, "Relationship"]
""" Registry of the relationships on a model:
    A dictionary mapping property name to relationship """


class Registry:
    models: Dict[_ModelName, _ModelRelationships]
    relationships: Dict[_RelationshipName, "Relationship"]
    managed: Dict[_ModelName, t.struct]
    discovery: "_RelationshipDiscovery"

    def __init__(self):
        self.models = defaultdict(dict)
        self.relationships = dict()
        self.managed = {}
        self.discovery = _RelationshipDiscovery(self)

    def manage(self, model: t.struct):
        if model.name in self.managed:
            return

        relationships = self.discovery.scan_model(model)

        for rel in relationships:
            self._add(rel)

        self.managed[model.name] = model

        for rel in relationships:
            self.manage(rel.other(model).typ)

    def _add(self, rel: "Relationship"):
        left_model_relationships = self.models[rel.left.typ.name]
        if rel.left.field in left_model_relationships:
            raise Exception(
                f"field '{rel.left.field}' on '{rel.left.typ.name}' already in a relationship"
            )

        right_model_relationships = self.models[rel.right.typ.name]
        if rel.right.field in right_model_relationships:
            raise Exception(
                f"field '{rel.right.field}' on '{rel.right.typ.name}' already in a relationship"
            )

        left_model_relationships[rel.left.field] = rel
        right_model_relationships[rel.right.field] = rel
        self.relationships[rel.name] = rel

    def _has(self, model_name: _ModelName, prop_name: _PropertyName) -> bool:
        return model_name in self.models and prop_name in self.models[model_name]


class Cardinality(StrEnum):
    OPTIONAL = auto()
    ONE = auto()
    MANY = auto()

    def is_one(self) -> bool:
        return self == Cardinality.ONE

    def is_optional(self) -> bool:
        return self == Cardinality.OPTIONAL

    def is_many(self) -> bool:
        return self == Cardinality.MANY


class Side(StrEnum):
    LEFT = auto()
    RIGHT = auto()

    def is_left(self) -> bool:
        return self == Side.LEFT

    def is_right(self) -> bool:
        return self == Side.RIGHT


@frozen
class RelationshipModel:
    typ: t.struct
    field: str  # field of this model pointing to the other side
    cardinality: Cardinality  # cardinality of the field pointing to the other model

    def _has_fkey(self) -> Optional[bool]:
        target_type = self.get_target_type()
        if isinstance(target_type, LinkProxy):
            return target_type.fkey
        return None

    def _get_name(self) -> Optional[str]:
        target_type = self.get_target_type()
        if isinstance(target_type, LinkProxy):
            return target_type.rel_name
        return None

    def get_target_type(self) -> TypeNode:
        return self.typ.props[self.field]

    def get_target_field(self) -> Optional[str]:
        target_type = self.get_target_type()
        if isinstance(target_type, LinkProxy):
            return target_type.target_field
        return None

    def __str__(self):
        fields = [
            f"type={repr(self.typ.name)}",
            f"field={repr(self.field)}",
            f"cardinality={self.cardinality}",
        ]
        return f"RelationshipModel({', '.join(fields)})"

    @classmethod
    def optional(cls, model_type: t.struct, target_field: str) -> "RelationshipModel":
        return cls(model_type, target_field, Cardinality.OPTIONAL)

    @classmethod
    def one(cls, model_type: t.struct, target_field: str) -> "RelationshipModel":
        return cls(model_type, target_field, Cardinality.ONE)

    @classmethod
    def many(cls, model_type: t.struct, target_field: str) -> "RelationshipModel":
        return cls(model_type, target_field, Cardinality.MANY)

    @classmethod
    def __validate_on(
        cls, model: "RelationshipModel", other_model: "RelationshipModel"
    ):
        card = model.cardinality

        target_type = model.typ.props[model.field]

        # validate target_field
        if isinstance(target_type, LinkProxy):
            target_field = target_type.target_field
            assert target_field is None or target_field == other_model.field

        # validate cardinality
        if card.is_one():
            assert model.typ.props[model.field].name == other_model.typ.name
        elif card.is_optional():
            target_type = resolve_proxy(target_type)
            assert (
                isinstance(target_type, t.optional)
                and target_type.of.name == other_model.typ.name
            )
        elif card.is_many():
            target_type = resolve_proxy(target_type)
            assert (
                isinstance(target_type, t.array)
                and target_type.of.name == other_model.typ.name
            )

    @classmethod
    def _validate_pair(
        cls, first: "RelationshipModel", second: "RelationshipModel"
    ) -> Optional[_RelationshipName]:
        name = first._get_name()
        other_name = second._get_name()
        if other_name is not None:
            if name is None:
                name = other_name
            elif other_name != name:
                raise Exception("Two sides of a relationship must have the same name")

        cls.__validate_on(first, second)
        cls.__validate_on(second, first)

        if first.cardinality.is_many() and second.cardinality.is_many():
            # unreachable
            raise Exception(
                "Many-to-many relationship not supported: please use a explicit joining struct"
            )

        return name

    @classmethod
    def _find_fkey_idx(
        cls, rels: Tuple["RelationshipModel", "RelationshipModel"]
    ) -> Optional[int]:
        has_fkey = tuple(r._has_fkey() for r in rels)

        if has_fkey[0] is None:
            if has_fkey[1] is None:
                return None
            if has_fkey[1]:
                return 1
            else:  # has_fkey[1] == False
                return 0

        # > has_fkey[0] is not None
        if has_fkey[1] is None:
            if has_fkey[0]:
                return 0
            else:  # has_fkey[0] == False
                return 1

        # > has_fkey[0] is not None and has_fkey[1] is not None
        if has_fkey[0]:
            if has_fkey[1]:
                raise AmbiguousSide(rels, True)
            # > has_fkey[1] == False
            return 0

        # > has_fkey[0] == False
        if not has_fkey[1]:  # has_fkey[1] == Falses
            raise AmbiguousSide(rels, False)


class Relationship:
    left: RelationshipModel
    right: RelationshipModel
    name: str = field(init=False, default="")

    def __init__(
        self, left: RelationshipModel, right: RelationshipModel, generated_name: str
    ):
        name = RelationshipModel._validate_pair(left, right)
        self.left = left
        self.right = right
        self.name = name or generated_name

    def side_of(self, model_name: str) -> Optional[Side]:
        left = self.left.typ.name
        right = self.right.typ.name
        if left == right:  # self relationship
            if left == model_name:
                return None
        else:
            if left == model_name:
                return Side.LEFT
            if right == model_name:
                return Side.RIGHT
        raise Exception(
            f"Model '{model_name}' not found in either side of the relationship '{self.name}'"
        )

    # for self relationships
    def side_of_field(self, field: str) -> Side:
        assert self.left.typ.name == self.right.typ.name
        if self.left.field == field:
            return Side.LEFT
        if self.right.field == field:
            return Side.RIGHT
        raise Exception(
            " ".join(
                [
                    f"Field '{field}' is not found in either side",
                    f"of the self relationship '{self.name}'",
                    f"on '{self.left.typ.name}'",
                ]
            )
        )

    def other(self, model_type: t.struct) -> RelationshipModel:
        if self.left.typ.name == model_type.name:
            return self.right
        if self.right.typ.name == model_type.name:
            return self.left
        raise Exception("Unexpected")

    def __str__(self):
        lines = [
            f"Relationship(name={repr(self.name)})",
            f"> left: {self.left}",
            f"> right: {self.right}",
        ]
        return "\n".join(lines)


class NoRelationshipFound(Exception):
    def __init__(self, target_model: t.struct, source: RelationshipModel):
        super().__init__(
            " ".join(
                [
                    "No matching target field found",
                    f"on '{target_model.name}'",
                    f"for relationship from '{source.typ.name}'",
                    f"on field '{source.field}'",
                ]
            )
        )


def describe_field(rel_model: RelationshipModel):
    return f"field '{rel_model.field}' of type '{rel_model.typ.name}'"


class AmbiguousSide(Exception):
    def __init__(
        self,
        rels: Tuple[RelationshipModel, RelationshipModel],
        both_has_fkey: Optional[bool] = None,
    ):
        if both_has_fkey is None:
            suggestion = [
                "Please set `fkey=True`",
                "on the model/field that should have the foreign key",
            ]
        else:
            suggestion = [
                f"Please set `fkey={repr(not both_has_fkey)}`",
                "on the model/field that should{' not' if both_has_fkey else ''} have the fkey",
            ]

        message_parts = [
            "Cannot decide on which side of the relationship the foreign key should be:",
            " or ".join([describe_field(m) for m in rels]) + "?",
        ] + suggestion

        super().__init__(" ".join(message_parts))


class SameFkeyOnBothSides(Exception):
    def __init__(
        self, first: RelationshipModel, second: RelationshipModel, value: bool
    ):
        super().__init__(
            " ".join(
                [
                    "Only one side of a relationship can have the foreign key:",
                    f"set `fkey={repr(not value)}` on either",
                    " or ".join([describe_field(m) for m in (first, second)]),
                ]
            )
        )


class UniqueOnBothSides(Exception):
    def __init__(self, first: RelationshipModel, second: RelationshipModel):
        super().__init__(
            " ".join(
                [
                    "Only one side of a one-to-one relationship can have the 'unique' config:",
                    'set `.config("unique")` on either',
                    " or ".join([describe_field(m) for m in (first, second)]),
                ]
            )
        )


class AmbiguousTargets(Exception):
    def __init__(
        self,
        source: RelationshipModel,
        target_model: t.struct,
        alternatives: List[RelationshipModel],
        rel_name: Optional[str] = None,
    ):
        super().__init__(
            " ".join(
                [
                    "Could not decide the target field of the relationship",
                    f"from field '{source.field}' of model '{source.typ.name}'",
                    f"to model '{target_model.name}':",
                    ", ".join([m.field for m in alternatives]) + ".",
                    f"Add an explicitly named link: '{rel_name}'."
                    if rel_name is not None
                    else "Add explicitly named links on both sides or set target_field on one or both side.",
                ]
            )
        )


@define
class _RelationshipDiscovery:
    reg: Registry
    counter: int = field(default=0)

    def scan_model(self, model: t.struct) -> List["Relationship"]:
        assert isinstance(model, t.struct)

        res: List[Relationship] = []
        self_relationship_fields = set()

        def add_self_relationship(source: RelationshipModel):
            rel = self.self_relationship(source)
            for m in (rel.left, rel.right):
                self_relationship_fields.add(m.field)
            res.append(self.self_relationship(source))

        for [prop_name, prop_type] in model.props.items():
            if self.reg._has(model.name, prop_name):
                continue

            if prop_name in self_relationship_fields:
                continue

            prop_type = resolve_proxy(prop_type)

            if isinstance(prop_type, t.struct):
                source = RelationshipModel.one(model, prop_name)
                if model.name == prop_type.name:  # self relationship
                    add_self_relationship(source)
                else:
                    res.append(self.from_side_one(prop_type, source))

            elif isinstance(prop_type, t.optional):
                target_model = resolve_proxy(prop_type.of)
                if isinstance(target_model, t.struct):
                    source = RelationshipModel.optional(model, prop_name)
                    if model.name == target_model.name:
                        add_self_relationship(source)
                    else:
                        res.append(self.from_side_optional(target_model, source))

            elif isinstance(prop_type, t.array):
                target_model = resolve_proxy(prop_type.of)
                if isinstance(target_model, t.struct):
                    source = RelationshipModel.many(model, prop_name)
                    if model.name == target_model.name:
                        add_self_relationship(source)
                    else:
                        res.append(self.from_side_many(target_model, source))

        return res

    def from_side_optional(
        self, target_model: t.struct, source: RelationshipModel
    ) -> "Relationship":
        assert source.cardinality.is_optional()

        alternatives = find_relationship_models(target_model, source.typ.name)

        if len(alternatives) == 0:
            raise NoRelationshipFound(target_model, source)

        if len(alternatives) > 1:
            rel_name = source._get_name()

            if rel_name is None:
                # match with target_field
                target_field = source.get_target_field()
                if target_field is None:
                    # reverse target look-up
                    other = find_relationship_to_target_field(alternatives, source)
                else:
                    other = find_relationship_on_field(
                        alternatives, source, target_field
                    )

            else:
                # match with rel_name
                other = find_named_relationship(
                    alternatives, source, target_model, rel_name
                )

        else:  # > len(alternatives) == 1
            other = alternatives[0]

        if other.cardinality.is_optional():
            # optional one-to-one
            fkey_idx = RelationshipModel._find_fkey_idx((source, other))
            if fkey_idx is None:
                return self.__from_optional_one_to_one(source, other)
            left, right = map(
                lambda idx: (source, other)[idx], (fkey_idx, 1 - fkey_idx)
            )
            return self.gen(left, right)

        if other.cardinality.is_one():
            # >> left, right = other, source
            fkey_idx = RelationshipModel._find_fkey_idx((source, other))
            if fkey_idx is not None and fkey_idx != 1:
                raise Exception(
                    "The foreign key must be on the link to the non-optional model"
                )

            return self.gen(other, source)

        # other.cardinality.is_many
        # >> left, right = source, other
        fkey_idx = RelationshipModel._find_fkey_idx((source, other))
        if fkey_idx is not None and fkey_idx != 0:
            raise Exception(
                "The foreign key must be on the link to the non-array model"
            )

        # optional one-to-many
        return self.gen(source, other)

    def from_side_one(
        self, target_model: t.struct, source: RelationshipModel
    ) -> "Relationship":
        assert source.cardinality.is_one()

        alternatives = find_relationship_models(target_model, source.typ.name)

        if len(alternatives) == 0:
            raise NoRelationshipFound(target_model, source)

        if len(alternatives) > 1:
            rel_name = source._get_name()

            if rel_name is None:
                # match target_field
                target_field = source.get_target_field()
                if target_field is None:
                    raise AmbiguousTargets(source, target_model, alternatives)
                other = find_relationship_on_field(alternatives, source, target_field)

            else:
                # match with rel_name
                other = find_named_relationship(
                    alternatives, source, target_model, rel_name
                )

        else:  # len(alternatives) == 1
            other = alternatives[0]

        if other.cardinality.is_one():
            return self.__from_optional_one_to_one(source, other)

        # left, right = source, other
        fkey_idx = RelationshipModel._find_fkey_idx((source, other))
        if fkey_idx is not None and fkey_idx != 0:
            non_fkey_target_type = (
                "optional" if other.cardinality.is_optional() else "array"
            )
            raise Exception(
                f"The foreign key must be on the link to the non-{non_fkey_target_type} model"
            )

        return self.gen(source, other)

    # target_type on both sides of the relationship are optional
    def __from_optional_one_to_one(
        self, first: "RelationshipModel", second: "RelationshipModel"
    ) -> "Relationship":
        fkey_on_first = first._has_fkey()
        fkey_on_second = second._has_fkey()

        if fkey_on_first is None:
            if fkey_on_second is None:
                return self.__from_optional_one_to_one_without_fkey(first, second)
            if fkey_on_second:
                return self.gen(second, first)
            else:  # fkey_on_second == False --> implies fkey on first
                return self.gen(first, second)

        # fkey_on_first is not None
        if fkey_on_second is None:
            if fkey_on_first:
                return self.gen(first, second)
            else:  # fkey_on_first == False --> implise fkey on second
                return self.gen(second, first)

        # both not None
        if fkey_on_first:
            if fkey_on_second:
                raise SameFkeyOnBothSides(first, second, True)
            return self.gen(first, second)

        # fkey_on_first == False
        if not fkey_on_second:  # fkey_on_second == False
            raise SameFkeyOnBothSides(first, second, False)
        return self.gen(second, first)

    def __from_optional_one_to_one_without_fkey(
        self, first: "RelationshipModel", second: "RelationshipModel"
    ) -> "Relationship":
        # foreign key will be on the field that has the unique attribute
        first_target_type = resolve_proxy(first.get_target_type())
        first_target_is_unique = first_target_type.runtime_config.get("unique", False)
        second_target_type = resolve_proxy(second.get_target_type())
        second_target_is_unique = second_target_type.runtime_config.get("unique", False)

        if first_target_is_unique:
            if second_target_is_unique:
                raise UniqueOnBothSides(first, second)
            # left = first
            return self.gen(first, second)

        if not second_target_is_unique:
            raise AmbiguousSide((first, second))

        return self.gen(second, first)

    def from_side_many(
        self, target_model: t.struct, source: RelationshipModel
    ) -> "Relationship":
        assert source.cardinality.is_many()

        alternatives = find_relationship_models(target_model, source.typ.name)

        if len(alternatives) == 0:
            raise NoRelationshipFound(target_model, source)

        if len(alternatives) > 1:
            alternatives = list(
                filter(lambda model: not model.cardinality.is_many(), alternatives)
            )
            if len(alternatives) == 0:
                raise Exception(
                    "Many-to-many relationship not supported: please use an explicit joining struct"
                )

            if len(alternatives) > 1:
                rel_name = source._get_name()

                if rel_name is None:
                    # match with target_field
                    target_field = source.get_target_field()
                    if target_field is None:
                        raise AmbiguousTargets(source, target_model, alternatives)
                    other = find_relationship_on_field(
                        alternatives, source, target_field
                    )

                else:
                    # match with rel_name
                    other = find_named_relationship(
                        alternatives, source, target_model, rel_name
                    )

            else:  # len(alternatives) == 1
                other = alternatives[0]

        else:
            other = alternatives[0]
            if other.cardinality.is_many():
                raise Exception(
                    "Many-to-many relationship not supported: please use an explicit joining struct"
                )

        # > other is not None

        # left, right = other, source
        fkey_idx = RelationshipModel._find_fkey_idx((source, other))
        if fkey_idx is not None and fkey_idx != 1:
            raise Exception(
                "The foreign key must be on the link to the non-array model"
            )

        # optional-to-many/one-to-many
        return self.gen(other, source)

    def self_relationship(self, source: RelationshipModel) -> "Relationship":
        alternatives = find_relationship_models(source.typ, source.typ.name)
        alternatives = [m for m in alternatives if m.field != source.field]

        if source.cardinality.is_many():
            alternatives = [m for m in alternatives if not m.cardinality.is_many()]
            if len(alternatives) == 0:
                raise Exception(
                    "Many-to-many relationship not supported: please use an explicit joining struct"
                )

        if len(alternatives) == 0:
            raise NoRelationshipFound(source.typ, source)

        if len(alternatives) > 1:
            rel_name = source._get_name()

            if rel_name is None:
                # match with target_field
                target_field = source.get_target_field()
                if target_field is not None:
                    other = find_relationship_on_field(
                        alternatives, source, target_field
                    )
                else:
                    other = find_relationship_to_target_field(alternatives, source)

            else:
                # match with rel_name
                other = find_named_relationship(
                    alternatives, source, source.typ, rel_name
                )

        else:
            other = alternatives[0]

        if source.cardinality.is_many():
            assert not other.cardinality.is_many()
            # left = other
            return self.gen(other, source)

        if source.cardinality.is_one():
            if not other.cardinality.is_one():
                # left = source
                return self.gen(source, other)
            raise Exception("One side of a one-to-one relationship must be optional")

        # source.cardinality.is_optional():
        if other.cardinality.is_one():
            # left = other
            return self.gen(other, source)

        if other.cardinality.is_many():
            # left = source
            return self.gen(source, other)

        return self.__from_optional_one_to_one(source, other)

    def gen(self, left: RelationshipModel, right: RelationshipModel) -> Relationship:
        self.counter += 1
        generated_name = f"__rel_{left.typ.name}_{right.typ.name}_{self.counter}"
        return Relationship(left, right, generated_name)


def find_named_relationship(
    alternatives: List[RelationshipModel],
    source: RelationshipModel,
    target_model: t.struct,
    rel_name: str,
) -> RelationshipModel:
    unnamed = []
    named = []

    for rel in alternatives:
        other_name = rel._get_name()
        if other_name is None:
            unnamed.append(rel)
        elif rel_name == other_name:
            named.append(rel)
        # else: named differently: unacceptable

    if len(named) > 1:
        raise Exception(
            " ".join(
                [
                    f"Found more than one relationships named '{rel_name}'",
                    f"on model '{target_model.name}':",
                    ", ".join([m.field for m in named]),
                ]
            )
        )

    if len(named) == 1:
        return named[0]

    if len(unnamed) == 0:
        raise NoRelationshipFound(target_model, source)

    if len(unnamed) == 1:
        return unnamed[0]

    raise AmbiguousTargets(source, target_model, unnamed, rel_name)


def find_relationship_on_field(
    alternatives: List[RelationshipModel], source: RelationshipModel, field_name: str
) -> RelationshipModel:
    found = [m for m in alternatives if m.field == field_name]
    if len(found) > 1:
        raise AmbiguousTargets(source, found[0].typ, found)
    if len(found) == 0:
        raise NoRelationshipFound(alternatives[0].typ, source)
    # > len(found) == 1
    return found[0]


def find_relationship_to_target_field(
    alternatives: List[RelationshipModel], source: RelationshipModel
) -> RelationshipModel:
    found = [m for m in alternatives if m.get_target_field() == source.field]
    if len(found) > 1:
        raise AmbiguousTargets(source, found[0].typ, found)
    if len(found) == 0:
        raise NoRelationshipFound(alternatives[0].typ, source)
    # > len(found) == 1
    return found[0]


def find_relationship_models(
    from_model: t.struct, target_model_name: str
) -> List[RelationshipModel]:
    res: List[RelationshipModel] = []

    for [prop_name, prop_type] in from_model.props.items():
        prop_type = resolve_proxy(prop_type)

        if isinstance(prop_type, t.struct) and prop_type.name == target_model_name:
            res.append(RelationshipModel.one(from_model, prop_name))

        elif isinstance(prop_type, t.optional):
            target_model = resolve_proxy(prop_type.of)
            if (
                isinstance(target_model, t.struct)
                and target_model.name == target_model_name
            ):
                res.append(RelationshipModel.optional(from_model, prop_name))

        elif isinstance(prop_type, t.array):
            target_model = resolve_proxy(prop_type.of)
            if (
                isinstance(target_model, t.struct)
                and target_model.name == target_model_name
            ):
                res.append(RelationshipModel.many(from_model, prop_name))

    return res


def get_other(pair: Tuple[Any, Any], first: Any):
    if first == pair[0]:
        return pair[1]
    if first == pair[1]:
        return pair[0]
    raise Exception("Unexpected")
