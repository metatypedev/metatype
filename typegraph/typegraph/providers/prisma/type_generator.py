from typing import List, Optional, Union, Dict, DefaultDict, Tuple
from collections import defaultdict
from typegraph import t
from typegraph.providers.prisma.relations import Relation, check_field
from typegraph.graph.typegraph import resolve_proxy, find
from typegraph.providers.prisma.utils import resolve_entity_quantifier
from attrs import frozen, field


@frozen
class TypeGenerator:
    relations: Dict[str, Relation]
    models: Dict[str, t.struct]
    relation_by_models: DefaultDict[str, List[str]] = field(
        init=False, factory=lambda: defaultdict(list)
    )

    def __attrs_post_init__(self):
        for rel_name, rel in self.relations.items():
            self.relation_by_models[rel.owner_type.name].append(rel_name)
            self.relation_by_models[rel.owned_type.name].append(rel_name)

    def __find_relation(
        self, tpe: t.struct, field_name: str
    ) -> Optional[Tuple[str, Relation]]:
        if not check_field(tpe, field_name):
            return None

        type_name = tpe.name
        return next(
            (
                (relname, relation)
                for relname, relation in (
                    (relname, self.relations[relname])
                    for relname in self.relation_by_models[type_name]
                )
                if (
                    relation.owner_type.name == type_name
                    and relation.owner_field == field_name
                )
                or (
                    relation.owned_type.name == type_name
                    and relation.owned_field == field_name
                )
            ),
            None,
        )

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
            relname, relation = self.__find_relation(tpe, key)
            if relname is not None:
                if relname in skip:
                    continue
                out = resolve_proxy(resolve_entity_quantifier)
                entries = {
                    "create": self.get_input_type(
                        out, skip=skip | {relname}, name=f"Input{out.name}Create"
                    ).optional(),
                    "connect": self.get_where_type(
                        out, name=f"Input{out.name}"
                    ).optional(),
                }
                if relation.is_owner(tpe) and relation.is_one_to_many():
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
            if v.runtime is not None and v.runtime != tpe.runtime:
                continue

            nested = resolve_proxy(resolve_entity_quantifier(v))
            # relation
            if nested.type == "struct":
                if skip_rel:
                    continue
                fields[k] = self.get_where_type(v, skip_rel=True).optional()
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


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')
