# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import re
from typing import List, Optional, Pattern, Union

from attrs import evolve, field, frozen

from typegraph.effects import EffectType
from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.graph.typegraph import TypegraphContext
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.deno import ImportFunMat, PredefinedFunMat, PureFunMat
from typegraph.utils.attrs import always
from typegraph.utils.sanitizers import sanitize_ts_string


def policy_name_factory():
    tg = TypegraphContext.get_active()
    if tg is None:
        raise Exception("typegraph context needed")
    return f"policy_{tg.next_type_id()}"


EFFECTS = [str(eff) for eff in EffectType]


@frozen
class Policy(Node):
    name: str = field(factory=policy_name_factory, kw_only=True)
    mat: Materializer
    collector_target: str = always(Collector.policies)

    def named(self, name: str):
        return evolve(self, name=name)

    @property
    def edges(self) -> List[Node]:
        return [self.mat]

    def data(self, collector):
        return {
            "name": self.name,
            "materializer": collector.index(self.mat),
        }

    @classmethod
    def create_from(cls, p) -> Union["Policy", "EffectPolicies"]:
        if isinstance(p, Materializer):
            if isinstance(p, ImportFunMat):
                return cls(p).named(p.name)
            return cls(p)
        if isinstance(p, cls):
            return p
        if isinstance(p, dict):
            return EffectPolicies(**{str(eff): pol for eff, pol in p.items()})
        raise Exception(f"Cannot create Policy from a {type(p).__name__}")


class EffectPolicies(Node):
    none: Optional[Policy]
    update: Optional[Policy]
    create: Optional[Policy]
    delete: Optional[Policy]

    def __init__(self, **policies: Policy):
        super().__init__(None)  # collector_target is none
        count = 0
        for eff in EFFECTS:
            arg = policies.pop(str(eff), None)
            if arg is None:
                setattr(self, str(eff), None)
                continue

            p = Policy.create_from(arg)
            if not isinstance(p, Policy):
                raise Exception(f"Cannot create Policy from type '{type(p).__name__}'")
            setattr(self, str(eff), p)
            count += 1

        if count == 0:
            raise Exception("EffectPolicies: Must set at least one policy")

        if len(policies) > 0:
            args = ", ".join(map(lambda name: f"'{name}'", policies))
            raise Exception(f"EffectPolicies: Unexpected keyword arguments: {args}")

    @property
    def edges(self) -> List[Node]:
        return list(filter(None, map(lambda e: getattr(self, e), EFFECTS)))

    def data(self, collector):
        return {
            eff: collector.index(getattr(self, eff))
            for eff in EFFECTS
            if getattr(self, eff) is not None
        }


def public(name: str = "__public"):
    return Policy(PredefinedFunMat("true")).named(name)


def never(name: str = "__never"):
    return Policy(PredefinedFunMat("false")).named(name)


def ctx(dotaccess: str, value: Union[str, Pattern]):
    # join role_name, field with '__jwt' as prefix
    separator = "_"
    is_regex = isinstance(value, Pattern)
    value = sanitize_ts_string(value if not is_regex else value.pattern)
    dotaccess = sanitize_ts_string(dotaccess)
    jwt_name = re.sub(
        "[^a-zA-Z0-9_]+",
        separator,
        separator.join(
            [
                "__ctx",
                dotaccess,
                value,
            ]
        ),
    )
    check = (
        f""" value === "{value}" """
        if not is_regex
        else f""" new RegExp("{value}").test(value) """
    )
    src = f"""
            (_, {{ context }}) => {{
                const role_chunks = "{dotaccess}".split(".");
                let value = context?.[role_chunks.shift()];
                for (const chunk of role_chunks) {{
                    value = value?.[chunk];
                }}
                return {check};
            }}
        """
    return Policy(PureFunMat(src)).named(jwt_name)


def internal():
    return Policy(
        PureFunMat("(_, {context}) => context.provider === 'internal'")
    ).named("internal")
