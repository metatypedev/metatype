# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
from typing import Optional, Union

from attrs import frozen

from typegraph import t
from typegraph.graph.typegraph import find, resolve_proxy
from typegraph.providers.prisma.relations import RelationshipRegister
from typegraph.providers.prisma.utils import resolve_entity_quantifier


@frozen
class TypeGenerator:
    spec: RelationshipRegister

    def get_input_type(
        self,
        tpe: t.struct,
        skip=set(),  # set of relation names, indicates related models to skip
        update=False,
        name: Optional[str] = None,
    ) -> Union[t.typedef, t.NodeProxy]:
        proxy = name and find(name)
        if proxy is not None:
            return proxy

        fields = {}
        if not isinstance(tpe, t.struct):
            raise Exception(f'expected a struct, got: "{type(tpe).__name__}"')
        for key, field_type in tpe.props.items():
            field_type = resolve_proxy(field_type)
            proxy = self.spec.proxies[tpe.name].get(key)
            relname = proxy.link_name if proxy is not None else None
            if relname is not None:
                if relname in skip:
                    continue
                relation = self.spec.relations[relname]
                nested = resolve_proxy(resolve_entity_quantifier(field_type))

                entries = {
                    "create": self.get_input_type(
                        nested, skip=skip | {relname}, name=f"Input{nested.name}Create"
                    ).optional(),
                    "connect": self.get_where_type(
                        nested, name=f"Input{nested.name}"
                    ).optional(),
                }
                if (
                    relation.side_of(tpe.name).is_left()
                    and relation.cardinality.is_one_to_many()
                ):
                    entries["createMany"] = t.struct(
                        {"data": t.array(entries["create"].of)}
                    ).optional()

                fields[key] = t.struct(entries).optional()

            elif isinstance(field_type, t.func):
                raise Exception(f'Unsupported function field "{key}"')
            else:
                if update:
                    fields[key] = field_type.optional()
                else:  # create
                    if field_type.runtime_config.get("auto", False):
                        fields[key] = field_type.optional()
                    else:
                        fields[key] = field_type.replace()  # TODO clone

        if name is None:
            return t.struct(fields)
        else:
            return t.struct(fields).named(name)

    def get_out_type(
        self, tpe: t.typedef, name: Optional[str] = None
    ) -> Union[t.typedef, t.NodeProxy]:
        proxy = name and find(name)
        if proxy is not None:
            return proxy

        if isinstance(tpe, t.func):
            return self.get_out_type(tpe.out)

        if not isinstance(tpe, t.struct):
            return tpe
        ret = t.struct({k: self.get_out_type(v) for k, v in tpe.props.items()})
        if name is None:
            return ret
        else:
            return ret.named(name)

    def get_where_type(
        self, tpe: t.struct, skip_rel=False, name: Optional[str] = None
    ) -> t.struct:
        proxy = name and find(name)
        if proxy is not None:
            return proxy

        fields = {}

        for k, v in tpe.props.items():
            # not for this runtime
            v = resolve_proxy(v)
            if v.runtime is not None and v.runtime != tpe.runtime:
                continue

            nested = resolve_proxy(resolve_entity_quantifier(v))
            # relation
            if nested.type == "object":
                if skip_rel:
                    continue
                fields[k] = self.get_where_type(nested, skip_rel=True).optional()
                continue
            if isinstance(v, t.optional):
                v = v.of
            if isinstance(v, t.NodeProxy):
                v = v.get()
            fields[k] = v.optional()

        if name is None:
            return t.struct(fields)
        else:
            return t.struct(fields).named(name)

    # Idea :
    # where: { name: { not: { equals: "John" } } }
    # where: { NOT: [ { name: { contains: "e" } }, { unique: { equals: 1 } }]}
    # where: { AND: [ { unique: { gt: 2 } }, { name: { startsWith: "P" }}]}
    # what about recursive types ? (use t.proxy?)
    # where: { NOT: { NOT: { name: { startsWith: "P" }} }}
    def gen_query_where_expr(self, tpe: t.struct):
        tpe = self.get_where_type(tpe)
        any_type_opt = t.union(
            [
                t.integer(),
                t.float(),
                t.boolean(),
                t.string(),
                t.array(t.union([t.integer(), t.float(), t.boolean(), t.string()])),
                tpe,
            ]
        ).optional()

        # node level
        term = tpe.compose(
            {
                "not": any_type_opt,
                "equals": any_type_opt,
                "is": any_type_opt,
                "in": any_type_opt,
                "notIn": any_type_opt,
                "startsWith": t.string().optional(),
                "endsWith": t.string().optional(),  # to test
                "contains": t.string().optional(),
                "gt": any_type_opt,
                "lt": any_type_opt,  # to test
            }
        )

        node = t.struct({k: term for k in tpe.props.keys()})

        # root
        add_props = {
            "AND": t.array(node).optional(),
            "OR": t.array(node).optional(),
            "NOT": t.array(node).optional(),
        }
        return tpe.compose(add_props)

    # visit a terminal node and apply fn
    def deep_map(self, tpe: t.typedef, fn: callable) -> t.struct:
        if isinstance(tpe, t.array) or isinstance(tpe, t.optional):
            content = resolve_entity_quantifier(tpe)
            if isinstance(tpe, t.array):
                return t.array(self.deep_map(content, fn))
            else:
                return self.deep_map(content, fn).optional()

        if isinstance(tpe, t.struct):
            return t.struct({k: self.deep_map(v, fn) for k, v in tpe.props.items()})

        return fn(resolve_proxy(tpe))

    def promote_num_to_float(self, tpe: t.struct) -> t.struct:
        return self.deep_map(
            tpe, lambda term: t.float() if isinstance(term, t.number) else term
        )

    def add_nested_count(self, tpe: t.typedef, seen=set()) -> t.struct:
        tpe = resolve_proxy(tpe)
        new_props = {}
        countable = {}
        for k, v in tpe.props.items():
            # Note:
            # nested relations are not a represented as t.struct
            # we need to resolve the correct type first
            v = resolve_proxy(v)
            proxy = self.spec.proxies[tpe.name].get(k)
            relname = proxy.link_name if proxy is not None else None
            if relname is not None:
                if relname in seen:
                    continue
                if isinstance(v, t.array) or isinstance(v, t.optional):
                    # one to many (countable)
                    # Ex:
                    # "comments": db.link(t.array(g("Comment")), "postComment")
                    # node `v` can refer to a t.array or t.optional
                    nested = resolve_proxy(resolve_entity_quantifier(v))
                    new_nested = self.add_nested_count(nested, seen=seen | {relname})
                    assert isinstance(new_nested, t.struct)
                    if isinstance(v, t.array):
                        new_props[k] = t.array(new_nested)
                    else:
                        new_props[k] = new_nested.optional()
                    countable[k] = t.integer().optional()
                else:
                    # one to one
                    new_props[k] = v
            else:
                # simple type
                new_props[k] = v

        # only add _count properties to cols that are countable
        if len(countable) > 0:
            new_props["_count"] = t.struct(countable).optional()
        return t.struct(new_props)

    def generate_update_operation(self, terminal_node: t.typedef) -> t.struct:
        if isinstance(terminal_node, t.string):
            return t.struct({"set": t.string()})
        elif isinstance(terminal_node, t.boolean):
            return t.struct({"set": t.boolean()})
        elif isinstance(terminal_node, t.array):
            return t.struct({"set": terminal_node})
        elif isinstance(terminal_node, t.number):
            return t.union(
                [
                    t.struct({"set": terminal_node}),
                    t.struct({"multiply": terminal_node}),
                    t.struct({"decrement": terminal_node}),
                    t.struct({"increment": terminal_node}),
                ]
            )
        # Note: t.struct is not a terminal node
        return None

    def get_update_data_type(self, tpe: t.typedef) -> t.struct:
        data = {}
        for k, v in tpe.props.items():
            new_v = self.generate_update_operation(v)
            if new_v is not None:
                data[k] = new_v.optional()
        return t.struct(data)

    def extract_number_types(self, tpe: t.struct) -> t.struct:
        fields = {}
        for key, value in tpe.props.items():
            if isinstance(value, t.number):
                fields[key] = value
        return t.struct(fields)

    def get_order_by_type(self, tpe: t.struct) -> t.struct:
        term_node_value = t.enum(["asc", "desc"]).optional()
        remap_struct = self.deep_map(tpe, lambda _: term_node_value).optional()
        return t.array(remap_struct)


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')
