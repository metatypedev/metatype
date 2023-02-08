# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.


from collections import defaultdict
from typing import Dict
from typing import Optional
from typing import TYPE_CHECKING

from attrs import frozen
from strenum import StrEnum
from typegraph import types as t
from typegraph.graph.nodes import NodeProxy
from typegraph.graph.typegraph import resolve_proxy
from typegraph.graph.typegraph import TypeGraph
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
class Relation:
    left: FieldRelation
    right: FieldRelation

    def __attrs_post_init__(self):
        assert (
            self.left.name == self.right.name
        ), "left and right sides of a relationship must have the same name"
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


class RelationshipRegister:
    """
    Relationships are defined by `LinkProxy` NodeProxy types on the model types (`t.struct`).
    """

    runtime: "PrismaRuntime"
    types: Dict[str, t.struct]
    relations: Dict[str, Relation]
    proxies: Dict[str, Dict[str, LinkProxy]]

    def __init__(self, runtime):
        self.runtime = runtime
        self.types = {}
        self.relations = {}
        self.proxies = defaultdict(dict)

    def get_left_proxy(self, left_field: str, right: LinkProxy) -> LinkProxy:
        right_type = resolve_proxy(resolve_entity_quantifier(right.get()))
        prop_type = right_type.props[right.target_field]
        if not isinstance(prop_type, LinkProxy):
            prop_type = self.proxies[right_type.name][right.target_field]
        left = prop_type
        assert left.link_name == right.link_name
        left_type = left.get()
        assert left_type.type == "object", f"Expected object, got {left_type.type}"

        if left.target_field is not None:
            assert left.target_field == left_field
        else:
            left.target_field = left_field

        return left

    def get_right_proxy(self, right_field: str, left: LinkProxy) -> LinkProxy:
        left_type = left.get()
        prop_type = left_type.props[left.target_field]
        if not isinstance(prop_type, LinkProxy):
            prop_type = self.proxies[left_type.name][left.target_field]
        right = prop_type
        assert left.link_name == right.link_name
        assert right.get().type in [
            "optional",
            "array",
        ], f"Expected optional or array, got '{right.get().type}'"
        if right.target_field is not None:
            assert right.target_field == right_field
        else:
            right.target_field = right_field

        return right

    def get_link_from_proxy(
        self, proxy: LinkProxy, target_type: t.struct, target_field: str
    ):
        typ = proxy.get()

        if typ.type in ["optional", "array"]:
            right = proxy
            if right.target_field is None:
                right_type = resolve_proxy(resolve_entity_quantifier(right.get()))
                # TODO
                # match by link name
                fields = [
                    f
                    for f, ty in right_type.props.items()
                    if isinstance(ty, LinkProxy) and ty.link_name == right.link_name
                ]
                if len(fields) == 0:
                    print(
                        f"proxies: {repr({k: f'{l.link_name}, {l.name}, {l.target_field}' for k, l in self.proxies[right_type.name].items()})}"
                    )
                    fields = [
                        f
                        for f, p in self.proxies[right_type.name].items()
                        if p.link_name == right.link_name
                    ]
                print(f"right: link name={right.link_name}")
                assert len(fields) == 1, f"got: {repr(fields)}"
                right.target_field = fields[0]

            left_field = target_field
            left = self.get_left_proxy(left_field, right)
            return left, right

        assert typ.type == "object"
        left = proxy
        if left.target_field is None:
            left_type = left.get()
            fields = [
                f
                for f, ty in left_type.props.items()
                if isinstance(ty, LinkProxy) and ty.link_name == left.link_name
            ]
            assert len(fields) == 1
            left.target_field = fields[0]

        right_field = target_field
        right = self.get_right_proxy(right_field, left)
        return left, right

    def fill_proxy_target_field(self, proxy: LinkProxy, model: t.struct):
        if proxy.target_field is not None:
            return
        typ = proxy.get()

        if isinstance(typ, t.struct):
            left_model = typ

            fields = [
                f
                for f, ty in left_model.props.items()
                if isinstance(ty, LinkProxy) and ty.link_name == proxy.link_name
            ]
            assert (
                len(fields) <= 1
            ), f"Relationship names must be unique: got multiple '{proxy.link_name}' on '{left_model.name}': {', '.join(fields)}"
            if len(fields) == 1:
                proxy.target_field = fields[0]
                return

            fields = [
                f
                for f, ty in left_model.props.items()
                if isinstance(ty, t.optional)
                or isinstance(ty, t.array)
                and ty.of.name == model.name
            ]
            assert (
                len(fields) <= 1
            ), f"Ambiguous target field for '{proxy.link_name}' on '{left_model.name}': {' or '.join(fields)} ?"
            assert (
                len(fields) == 1
            ), f"No target for '{proxy.link_name}' on '{left_model.name}'"
            proxy.target_field = fields[0]
            return

        assert isinstance(typ, t.optional) or isinstance(typ, t.array)
        right_model = resolve_proxy(typ.of)
        assert isinstance(right_model, t.struct)

        fields = [
            f
            for f, ty in right_model.props.items()
            if isinstance(ty, LinkProxy) and ty.link_name == proxy.link_name
        ]
        assert (
            len(fields) <= 1
        ), f"Relationship names must be unique: got multiple '{proxy.link_name}' on '{right_model.name}': {', '.join(fields)}"
        if len(fields) == 1:
            proxy.target_field = fields[0]
            return

        fields = [f for f, ty in right_model.props.items() if ty.name == model.name]
        assert (
            len(fields) <= 1
        ), f"Ambiguous target field for '{proxy.link_name}' on '{right_model.name}': {' or '.join(fields)} ?"
        assert (
            len(fields) == 1
        ), f"No target for '{proxy.link_name}' on '{right_model.name}'"
        proxy.target_field = fields[0]

    # ensure that there is a proxy on the other side
    # TODO: full validation??
    def ensure_proxy_target(self, proxy: LinkProxy, field: str, model: t.struct):
        typ = proxy.get()
        self.fill_proxy_target_field(proxy, model)

        if isinstance(typ, t.struct):
            # TODO: find target field
            left_model = typ
            # assert proxy.target_field is not None
            right_proxy = left_model.props.get(proxy.target_field)

            assert (
                right_proxy is not None
            ), f"Expected field '{proxy.target_field}' on '{left_model.name}'"

            if isinstance(right_proxy, LinkProxy):
                assert right_proxy.link_name == proxy.link_name
                if right_proxy.target_field is None:
                    right_proxy.target_field = field
                else:
                    assert right_proxy.target_field == field
                registered_proxy = self.proxies[typ.name][proxy.target_field]
                if registered_proxy is None:
                    self.proxies[typ.name][proxy.target_field] = right_proxy
                else:
                    assert registered_proxy == right_proxy

            else:
                # wrap type in a proxy
                self.proxies[left_model.name][proxy.target_field] = self.runtime.link(
                    right_proxy, proxy.link_name, field
                )

        else:
            assert isinstance(typ, t.optional) or isinstance(
                typ, t.array
            ), "LinkProxy can only wrap a struct, optional or array"
            right_model = resolve_proxy(typ.of)
            assert isinstance(
                right_model, t.struct
            ), f"Expected an struct for a model, got '{right_model.type}'"

            left_proxy = right_model.props.get(proxy.target_field)
            assert (
                left_proxy is not None
            ), f"Expected field '{proxy.target_field}' on '{right_model.name}'"

            if isinstance(left_proxy, LinkProxy):
                assert left_proxy.link_name == proxy.link_name
                if left_proxy.target_field is None:
                    left_proxy.target_field = field
                else:
                    assert left_proxy.target_field == field

                registered_proxy = self.proxies[right_model.name].get(
                    proxy.target_field, None
                )
                if registered_proxy is None:
                    self.proxies[right_model.name][proxy.target_field] = left_proxy
                else:
                    assert registered_proxy == left_proxy

            else:
                # wrap type in a proxy
                self.proxies[right_model.name][proxy.target_field] = self.runtime.link(
                    left_proxy, proxy.link_name, field
                )

    def register_type(self, typ: t.struct):
        self.types[typ.name] = typ
        # TODO set runtime, propagate runtime
        proxies = self.proxies[typ.name]
        for prop_name, prop_type in typ.props.items():
            if isinstance(prop_type, LinkProxy):
                proxies[prop_name] = prop_type
                self.ensure_proxy_target(prop_type, prop_name, typ)
                continue
            if prop_name in proxies:
                continue

            prop_type = resolve_proxy(prop_type)
            if isinstance(prop_type, t.struct):
                # find all props of `prop_type` that define a relationship to `typ` (RIGHT proxy)
                fields = [
                    f
                    for f, ty in prop_type.props.items()
                    if isinstance(ty, LinkProxy)
                    and resolve_entity_quantifier(ty.get()).name == typ.name
                ]

                # todo: assert link_name
                assert (
                    len(fields) <= 1
                ), f"Link must be explicitly specified when there are more than one links targetting the same model: on '{prop_type.name}': {' or '.join(fields)}"

                if len(fields) == 1:
                    link_name = prop_type.props[fields[0]].link_name
                    proxies[prop_name] = self.runtime.link(
                        prop_type, link_name, fields[0]
                    )
                    continue

                # len(fields) == 0
                # find all props of `prop_type` of type optional/array of `typ`
                fields = [
                    f
                    for f, ty in prop_type.props.items()
                    if (isinstance(ty, t.optional) or isinstance(ty, t.array))
                    and resolve_entity_quantifier(ty).name == typ.name
                ]

                assert (
                    len(fields) <= 1
                ), f"Link must be explicitly specified when there are more than one implicit links targetting the same model: on '{prop_type.name}'"
                assert (
                    len(fields) == 1
                ), f"No field match to a relationship to '{typ.name}' on '{prop_type.name}'"
                # TODO handle eventual name clash
                link_name = f"_{typ.name}_to_{prop_type.name}"
                proxies[prop_name] = self.runtime.link(prop_type, link_name, fields[0])
                self.proxies[prop_type.name][fields[0]] = self.runtime.link(
                    prop_type.props[fields[0]], link_name, prop_name
                )
                self.ensure_proxy_target(proxies[prop_name], prop_name, typ)
                continue

            if isinstance(prop_type, t.optional) or isinstance(prop_type, t.array):
                model = resolve_proxy(prop_type.of)
                if not isinstance(model, t.struct):
                    continue

                # find all props of `model` that define a relationship to `typ` (LEFT proxy)
                fields = [
                    f
                    for f, ty in model.props.items()
                    if isinstance(ty, LinkProxy) and ty.name == typ.name
                ]

                assert (
                    len(fields) <= 1
                ), f"Ambiguous link targetting '{typ.name}' on '{model.name}': {' or '.join(fields)}?"

                if len(fields) == 1:
                    link_name = model.props[fields[0]].link_name
                    proxies[prop_name] = self.runtime.link(
                        prop_type, link_name, fields[0]
                    )
                    continue

                # len(fields) == 0
                # find all props of `model` of `typ`
                fields = [
                    f
                    for f, ty in model.props.items()
                    if ty.name == typ.name
                    # if isinstance(resolve_proxy(ty))
                ]
                assert len(fields) <= 1
                assert len(fields) == 1
                # TODO handle eventual name clash
                # generate link_name
                link_name = f"_{model.name}_to_{typ.name}"
                proxies[prop_name] = self.runtime.link(prop_type, link_name, fields[0])
                self.proxies[model.name][fields[0]] = self.runtime.link(
                    model.props[fields[0]], link_name, prop_name
                )

    def manage(self, typ: t.struct):
        if typ.name in self.types:
            return

        assert typ.type == "object", f"Prisma cannot manage '{typ.type}' types"
        self.register_type(typ)

        deps = []

        for prop_name, proxy in self.proxies[typ.name].items():
            left_proxy, right_proxy = self.get_link_from_proxy(proxy, typ, prop_name)

            rel = create_relationship(left_proxy, right_proxy)
            self.relations[rel.name] = rel
            deps.append(rel.left.typ)
            deps.append(rel.right.typ)

        for ty in deps:
            self.manage(ty)


def create_relationship(left_proxy: LinkProxy, right_proxy: LinkProxy) -> Relation:
    left_type = left_proxy.get()
    left_model = left_type
    right_type = right_proxy.get()
    right_model = resolve_proxy(resolve_entity_quantifier(right_type))
    assert left_model.type == "object", "Relationships can only be defined on objects"
    assert (
        right_type.type in ["optional", "array"] and right_model.type == "object"
    ), "Right side of a relationship must be an array or optional"

    left_field = left_proxy.target_field
    right_field = right_proxy.target_field
    assert left_model.props[left_field].name == right_type.name
    assert right_model.props[right_field].name == left_type.name

    cardinality, q = (
        (Cardinality.ONE, "?")
        if right_type.type == "optional"
        else (Cardinality.MANY, "[]")
    )
    relname = left_proxy.link_name

    return Relation(
        left=FieldRelation(
            name=relname,
            typ=left_model,
            field=right_proxy.target_field,  # what??
            cardinality=cardinality,
            side=Side.LEFT,
        ),
        right=FieldRelation(
            name=relname,
            typ=right_model,
            field=left_proxy.target_field,  # what??
            cardinality=cardinality,
            side=Side.RIGHT,
        ),
    )
