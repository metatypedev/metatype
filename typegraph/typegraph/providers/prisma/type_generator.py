# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional
from typing import Union

from attrs import frozen
from typegraph import t
from typegraph.graph.typegraph import find
from typegraph.graph.typegraph import resolve_proxy
from typegraph.providers.prisma.relations import check_field
from typegraph.providers.prisma.relations import RelationshipRegister
from typegraph.providers.prisma.utils import resolve_entity_quantifier


@frozen
class TypeGenerator:
    spec: RelationshipRegister

    def __find_relation(self, tpe: t.struct, field_name: str) -> Optional[str]:
        if not check_field(tpe, field_name):
            return None

        return self.spec.field_relations[tpe.name][field_name].name

        # type_name = tpe.name
        # return next(
        #     (
        #         relname
        #         for relname, relation in (
        #             (relname, self.spec.relations[relname])
        #             for relname in self.spec.relation_by_models[type_name]
        #         )
        #         if (
        #             relation.owner_type.name == type_name
        #             and relation.owner_field == field_name
        #         )
        #         or (
        #             relation.owned_type.name == type_name
        #             and relation.owned_field == field_name
        #         )
        #     ),
        #     None,
        # )

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
            relname = self.__find_relation(tpe, key)
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


def unsupported_cardinality(c: str):
    return Exception(f'Unsupported cardinality "{c}"')
