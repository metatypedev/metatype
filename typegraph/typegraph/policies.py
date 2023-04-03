# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from re import sub as reg_sub
from typing import List, Optional, Union

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


EFFECTS = [eff.value for eff in EffectType]


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
            return EffectPolicies(**p)
        raise Exception(f"Cannot create Policy from a {type(p).__name__}")


effect_values = ["none"] + [e.value for e in EffectType]


class EffectPolicies(Node):
    none: Optional[Policy]
    update: Optional[Policy]
    upsert: Optional[Policy]
    create: Optional[Policy]
    delete: Optional[Policy]

    def __init__(self, **kwargs):
        super().__init__(None)  # collector_target is none
        count = 0
        for eff in effect_values:
            arg = kwargs.pop(eff, None)
            if arg is None:
                setattr(self, eff, None)
                continue

            p = Policy.create_from(arg)
            if not isinstance(p, Policy):
                raise Exception(f"Cannot create Policy from type '{type(p).__name__}'")
            setattr(self, eff, p)
            count += 1

        if count == 0:
            raise Exception("EffectPolicies: Must set at least one policy")

        if len(kwargs) > 0:
            args = ", ".join(map(lambda name: f"'{name}'", kwargs))
            raise Exception(f"EffectPolicies: Unexpected keyword arguments: {args}")

    @property
    def edges(self) -> List[Node]:
        return list(filter(None, map(lambda e: getattr(self, e), effect_values)))

    def data(self, collector):
        return {
            eff: collector.index(getattr(self, eff))
            for eff in effect_values
            if getattr(self, eff) is not None
        }


def public(name: str = "__public"):
    return Policy(PredefinedFunMat("true")).named(name)


def jwt(dotaccess: str, value: str):
    # join role_name, field with '__jwt' as prefix
    separator, pattern = "_", r"[^a-zA-Z0-9_]+"
    prefix = "__jwt"
    jwt_name = reg_sub(pattern, separator, separator.join([prefix, dotaccess, value]))
    # build the policy
    dotaccess = sanitize_ts_string(dotaccess)
    value = sanitize_ts_string(value)
    src = f"""
            (_, {{ context }}) => {{
                const role_chunks = "{dotaccess}".split(".");
                let value = context?.[role_chunks.shift()];
                for (const chunk of role_chunks) {{
                    value = value?.[chunk];
                }}
                return value === "{value}";
            }}
        """
    return Policy(PureFunMat(src)).named(jwt_name)


def internal():
    return Policy(
        PureFunMat("(_, {context}) => context.provider === 'internal'")
    ).named("internal")
