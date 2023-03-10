# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from collections import defaultdict

from attr import field
from typegraph import t, TypeGraph
from attrs import define, frozen
from typing import TYPE_CHECKING, Any, Optional, Tuple, List, Dict
from enum import auto
from strenum import StrEnum
from typegraph.graph.nodes import NodeProxy

from typegraph.graph.typegraph import resolve_proxy

if TYPE_CHECKING:
    from typegraph.providers.prisma.runtimes.prisma import PrismaRuntime


class LinkProxy(NodeProxy):
    rel_name: Optional[str]
    fkey: Optional[bool]
    target_field: Optional[str]

    def __init__(
        self,
        g: TypeGraph,
        node: str,
        _runtime: "PrismaRuntime",  # TODO: remove
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
    runtime: "PrismaRuntime"
    models: Dict[_ModelName, _ModelRelationships]
    relationships: Dict[_RelationshipName, "Relationship"]
    managed: Dict[_ModelName, t.struct]
    counter: int
    discovery: "_RelationshipDiscovery"

    def __init__(self, runtime: "PrismaRuntime"):
        self.runtime = runtime
        self.models = defaultdict(dict)
        self.relationships = dict()
        self.managed = {}
        self.discovery = _RelationshipDiscovery(self)
        self.counter = 0

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

    def _next_id(self):
        self.counter += 1
        return self.counter

    @classmethod
    def _get_active(cls) -> "Registry":
        if cls.active_registry is None:
            raise Exception("No active registry")
        return cls.active_registry


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

    def __has_fkey(self) -> Optional[bool]:
        target_type = self.typ.props[self.field]
        if isinstance(target_type, LinkProxy):
            return target_type.fkey
        return None

    def _get_name(self) -> Optional[str]:
        target_type = self.typ.props[self.field]
        if isinstance(target_type, LinkProxy):
            return target_type.rel_name

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
    def _find_fkey(cls, first: "RelationshipModel", second: "RelationshipModel"):
        fkey_on_first = first.__has_fkey()
        fkey_on_second = second.__has_fkey()

        if fkey_on_first is None:
            if fkey_on_second is None:
                return None
            if fkey_on_second:
                return second
            else:
                return first

        # fkey_on_first is not None
        if fkey_on_second is None:
            if fkey_on_first:
                return first
            else:
                return second

        # fkey_on_first is not None and fkey_on_second is not None
        if fkey_on_first:
            if fkey_on_second:
                raise Exception(
                    "Only one side of a relationship can have the foreign key: set `fkey=False` on one side"
                )
            return first

        # fkey_on_first == False
        if not fkey_on_second:
            raise Exception(
                "One side of a relationship must have the foreigh key: set `fkey=True` on one side"
            )
        return second


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

    def side_of(self, model_name: str) -> Side:
        if self.left.typ.name == model_name:
            return Side.LEFT
        if self.right.typ.name == model_name:
            return Side.RIGHT
        raise Exception(
            f"Model '{model_name}' not found in either side of the relationship '{self.name}'"
        )

    def other(self, model_type: t.struct) -> RelationshipModel:
        if self.left.typ.name == model_type.name:
            return self.right
        if self.right.typ.name == model_type.name:
            return self.left
        raise Exception("Unexpected")


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


class AmbiguousSide(Exception):
    def __init__(self, first: RelationshipModel, second: RelationshipModel):
        super().__init__(
            " ".join(
                [
                    "Cannot decide on which side of the relationship the foreign key should be:",
                    " or ".join(
                        [
                            f"field '{m.field}' of '{m.typ.name}'"
                            for m in (first, second)
                        ]
                    )
                    + ".",
                    "Please set link(target_type, fkey=True)",
                    "on the model that should have the foreign key.",
                ]
            )
        )


class AmbiguousTargets(Exception):
    def __init__(
        self,
        source_model: t.struct,
        target_model: t.struct,
        alternatives: List[RelationshipModel],
        rel_name: Optional[str] = None,
    ):
        super().__init__(
            " ".join(
                [
                    "Could not decide the target field of the relationship",
                    f"from '{source_model.name}'",
                    f"to '{target_model.name}':",
                    ", ".join([m.field for m in alternatives]) + ".",
                    f"Add an explicitly named link: '{rel_name}'."
                    if rel_name is not None
                    else "Add explicitly named links on both sides.",
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

        for [prop_name, prop_type] in model.props.items():
            if self.reg._has(model.name, prop_name):
                continue

            prop_type = resolve_proxy(prop_type)

            if isinstance(prop_type, t.struct):
                source = RelationshipModel.one(model, prop_name)
                res.append(self.from_side_one(prop_type, source))

            elif isinstance(prop_type, t.optional):
                target_model = resolve_proxy(prop_type.of)
                if isinstance(target_model, t.struct):
                    source = RelationshipModel.optional(model, prop_name)
                    res.append(self.from_side_optional(target_model, source))
                continue

            elif isinstance(prop_type, t.array):
                target_model = resolve_proxy(prop_type.of)
                if isinstance(target_model, t.struct):
                    source = RelationshipModel.many(model, prop_name)
                    res.append(self.from_side_many(target_model, source))
                continue

        return res

    def from_side_optional(
        self, target_model: t.struct, source: RelationshipModel
    ) -> "Relationship":
        assert source.cardinality.is_optional()

        alternatives = find_relationship_models(target_model, source.typ.name)

        if len(alternatives) == 0:
            raise NoRelationshipFound(target_model, source)

        if len(alternatives) == 1:
            [other] = alternatives

            if other.cardinality.is_optional():
                # optional-to-optional: required explicit fkey side
                left = RelationshipModel._find_fkey(source, other)
                if left is None:
                    raise AmbiguousSide(source, other)
                right = get_other((source, other), left)
                return self.gen(left, right)

            if other.cardinality.is_one():
                left = other
                with_fkey = RelationshipModel._find_fkey(source, other)
                if with_fkey is not None and with_fkey != left:
                    raise Exception(
                        "The foreign key must be onthe link to the non-optional model"
                    )

                return self.gen(other, source)

            # other.cardinality.is_many
            left = other
            with_fkey = RelationshipModel._find_fkey(source, other)
            if with_fkey is not None and with_fkey != left:
                raise Exception(
                    "The foreign key must be on the link to the non-array model"
                )

            # optional-to-many
            return self.gen(other, source)

        # TODO: more precision needed
        raise Exception("Not implemented")

    def from_side_one(
        self, target_model: t.struct, source: RelationshipModel
    ) -> "Relationship":
        assert source.cardinality.is_one()

        alternatives = find_relationship_models(target_model, source.typ.name)

        if len(alternatives) == 0:
            raise NoRelationshipFound(target_model, source)

        if len(alternatives) == 1:
            other = alternatives[0]

            if other.cardinality.is_one():
                # one_to_one must have an explicit fkey side
                left = RelationshipModel._find_fkey(source, other)
                if left is None:
                    raise AmbiguousSide(source, other)
                right = get_other((source, other), left)
                return self.gen(left, right)

            left = other
            right = source
            with_fkey = RelationshipModel._find_fkey(source, other)
            if with_fkey is not None and with_fkey != left:
                non_fkey_target_type = (
                    "optional" if other.cardinality.is_optional() else "array"
                )
                raise Exception(
                    f"The foreign key must be on the link to the non-{non_fkey_target_type} model"
                )

            return self.gen(left, right)

        # TODO: precision needed
        raise Exception("Not implemented")

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

            rel_name = source._get_name()
            if len(alternatives) > 1:
                # TODO extract a function for a better readability
                other = None
                if rel_name is not None:
                    unnamed_alternatives = []
                    other = None
                    for model in alternatives:
                        other_name = model._get_name()
                        if other_name is None:
                            unnamed_alternatives.append(model)
                        elif rel_name == other_name:
                            other = model
                            break

                    if other is None:
                        if len(unnamed_alternatives) == 1:
                            other = unnamed_alternatives[0]
                        elif len(unnamed_alternatives) == 0:
                            # all the alternatives are named, and none matches to the target
                            raise NoRelationshipFound(target_model, source)
                        else:
                            # found more than one unnamed relationships to `source`
                            raise AmbiguousTargets(
                                source.typ, target_model, alternatives, rel_name
                            )

                    # > other is not None

                else:  # rel_name is None
                    # find the unique unnamed relationship
                    alternatives = list(
                        filter(lambda m: m._get_name() is None, alternatives)
                    )
                    if len(alternatives) == 1:
                        other = alternatives[0]
                    elif len(alternatives) == 0:
                        # all the alternatives are named
                        raise NoRelationshipFound(target_model, source)
                    else:
                        # found more than one unnamed relatioships to `source`
                        raise AmbiguousTargets(source.typ, target_model, alternatives)

                    # > other is not None

            else:  # len(alternatives) == 1
                other = alternatives[0]

        else:
            other = alternatives[0]
            if other.cardinality.is_many():
                raise Exception(
                    "Many-to-many relationship not supported: please use an explicit joining struct"
                )

        # > other is not None

        left = other
        with_fkey = RelationshipModel._find_fkey(source, other)
        if with_fkey is not None and with_fkey != left:
            raise Exception(
                "The foreign key must be on the link to the non-array model"
            )

        # optional-to-many/one-to-many
        return self.gen(other, source)

    def gen(self, left: RelationshipModel, right: RelationshipModel) -> Relationship:
        self.counter += 1
        generated_name = f"__rel_{left.typ.name}_{right.typ.name}_{self.counter}"
        return Relationship(left, right, generated_name)


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
