# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional, Set, Union

from attrs import frozen

from typegraph import t
from typegraph.graph.typegraph import find, resolve_proxy
from typegraph.providers.prisma.relations import Registry
from typegraph.providers.prisma.utils import (
    rename_with_idx,
    resolve_entity_quantifier,
    undo_optional,
)


@frozen
class TypeGenerator:
    reg: Registry

    def get_input_type(
        self,
        tpe: t.struct,
        # set of relation names, indicates related models to skip
        skip: Set[str] = set(),
        update=False,
        name: Optional[str] = None,
    ) -> Union[t.typedef, t.NodeProxy]:
        proxy = find(name) if name is not None else None
        if proxy is not None:
            return proxy

        fields = {}
        if not isinstance(tpe, t.struct):
            raise Exception(f'expected a struct, got: "{type(tpe).__name__}"')

        for key, field_type in tpe.props.items():
            field_type = resolve_proxy(field_type)
            rel = self.reg.models[tpe.name].get(key)
            if rel is not None:
                if rel.name in skip:
                    continue
                nested = resolve_proxy(resolve_entity_quantifier(field_type))

                entries = {
                    "create": self.get_input_type(
                        nested, skip=skip | {rel.name}, name=f"Input{nested.name}Create"
                    ).optional(),
                    "connect": self.get_where_type(
                        nested, name=f"Input{nested.name}"
                    ).optional(),
                }
                side = rel.side_of(tpe.name) or rel.side_of_field(key)
                if side.is_right() and rel.right.cardinality.is_many():
                    entries["createMany"] = t.struct(
                        {"data": t.array(entries["create"].of)}
                    ).optional()

                fields[key] = t.struct(entries).optional()

            elif isinstance(field_type, t.func):
                # skip - managed by another from another runtime
                continue
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
            return tpe.out

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

    def gen_any_type(self):
        base_any_type = rename_with_idx(
            t.union([t.integer(), t.float(), t.boolean(), t.string()]), "base_any_type"
        )
        return t.union([base_any_type, t.array(base_any_type)])

    # Example:
    # t.X() => t.either([t.X(), struct_equals, struct_startsWith, ...])
    def extend_terminal_nodes_props(self, tpe: t.struct) -> t.struct:
        any_type = self.gen_any_type()

        # node level
        term_list = [
            t.struct({"equals": any_type}),
            t.struct({"in": any_type}),  # t.array(any_type) ??
            t.struct({"notIn": any_type}),  # t.array(any_type) ??
            t.struct({"startsWith": t.string()}),
            t.struct({"endsWith": t.string()}),
            t.struct({"contains": t.string()}),
            t.struct({"gt": any_type}),
            t.struct({"lt": any_type}),
            t.struct({"gte": any_type}),
            t.struct({"lte": any_type}),
        ]

        # rename with a prefix
        for i in range(len(term_list)):
            term = term_list[i]
            # use the first key
            prefix = next(iter(term.props))
            term_list[i] = rename_with_idx(term, prefix)

        node_props = {}
        for k, v in tpe.props.items():
            term = t.either(term_list + [undo_optional(v)])
            not_node = rename_with_idx(t.struct({"not": term}), "not")
            node_props[k] = t.either([not_node, term]).optional()

        return t.struct(node_props)

    # Examples:
    # where: { name: { not: { equals: "John" } } }
    # where: { AND: [ { unique: { gt: 2 } }, { name: { startsWith: "P" }}]}
    # where: { NOT: { NOT: { name: { startsWith: "P" }} }}
    # where: { field1: 4, field2: {gt: 3}}
    def gen_query_where_expr(
        self, tpe: t.struct, exclude_extra_fields=False
    ) -> t.struct:
        tpe = self.get_where_type(tpe)
        extended_tpe = self.extend_terminal_nodes_props(tpe)
        extended_tpe = rename_with_idx(extended_tpe, "extended_tpe")

        # define the terminal expression
        temp_props = {k: v.optional() for k, v in extended_tpe.props.items()}
        intermediate = t.proxy("???")
        if not exclude_extra_fields:
            temp_props["AND"] = t.array(intermediate).optional()
            temp_props["OR"] = t.array(intermediate).optional()
            temp_props["NOT"] = intermediate.optional()

        # renaming helps to register the orphan struct
        new_tpe = rename_with_idx(t.struct(temp_props), "inner_where_node")

        # now mutate the reference
        # this will allow us to extend the query recursively
        intermediate.node = new_tpe.name

        return new_tpe

    # Examples:
    # having: { field: {sum : {equals: 5}} }
    # having: { string: {in: ["group1", "group2"]} }
    # having: { int: 5 }
    def gen_having_expr(self, tpe: t.struct, aggreg_def: t.struct) -> t.struct:
        tpe = self.extend_terminal_nodes_props(tpe)

        new_props = {}
        for k, v in tpe.props.items():
            new_v = rename_with_idx(undo_optional(v), "term")
            types = [
                rename_with_idx(t.struct({agg_key: new_v}), agg_key)
                for agg_key in aggreg_def.props.keys()
            ]
            types.append(new_v)
            new_props[k] = t.union(types).optional()

        # special case
        # _all or _count is not a field recognized by prisma engine at root level
        # I am guessing this is because we can still use _count on other fields
        # new_props["_all"] = self.extend_terminal_nodes_props(
        #     t.struct({"_count": t.integer()})
        # )

        intermediate = t.proxy("???")
        new_props["AND"] = t.array(intermediate).optional()
        new_props["OR"] = t.array(intermediate).optional()
        new_props["NOT"] = intermediate.optional()

        # renaming helps to register the orphan struct
        new_tpe = rename_with_idx(t.struct(new_props), "inner_having_node")
        intermediate.node = new_tpe.name

        return new_tpe

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

            rel = self.reg.models[tpe.name].get(k)
            if rel is not None:
                relname = rel.name
                if relname in seen:
                    continue
                v = resolve_proxy(v)
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

        # only add _count to cols that are countable
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
                    rename_with_idx(t.struct({"set": terminal_node}), "set"),
                    rename_with_idx(t.struct({"multiply": terminal_node}), "multiply"),
                    rename_with_idx(
                        t.struct({"decrement": terminal_node}), "decrement"
                    ),
                    rename_with_idx(
                        t.struct({"increment": terminal_node}), "increment"
                    ),
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
        # TODO: global, named, only generated once per runtime
        sort = t.enum(["asc", "desc"]).optional()
        aggregate = t.struct(
            {k: sort.optional() for k in ["_count", "_avg", "_sum", "_min", "_max"]}
        ).optional()

        # orderByNulls is a preview feature in prisma: see
        # https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting#sort-with-null-records-first-or-last
        # sort_nulls = t.struct({"sort": sort, "nulls": t.enum(["first", "last"])})

        def get_sorting_type(tpe: t.TypeNode):
            tpe = resolve_proxy(tpe)

            # optional = False
            if isinstance(tpe, t.optional):
                # optional = True
                tpe = tpe.of

            if isinstance(tpe, t.struct):
                # relation
                # TODO: eventual infinite recursion
                return get_order_by(tpe).optional()

            if isinstance(tpe, t.array):
                nested_type = resolve_proxy(tpe.of)
                if isinstance(nested_type, t.struct):
                    return aggregate
                else:
                    # TODO: check prisma docs
                    return sort

            # scalar type

            # orderByNulls: preview feature in prisma
            # if optional:
            #     return t.either(sort, sort_nulls)

            return sort

        def get_order_by(tpe: t.struct):
            return t.struct({k: get_sorting_type(v) for k, v in tpe.props.items()})

        return t.array(get_order_by(tpe))


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')
