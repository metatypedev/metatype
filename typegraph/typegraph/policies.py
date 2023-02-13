# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from re import sub as reg_sub
from typing import List

from attrs import evolve, field, frozen

from typegraph.graph.builder import Collector
from typegraph.graph.nodes import Node
from typegraph.graph.typegraph import TypegraphContext
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.deno import PureFunMat
from typegraph.utils.attrs import always
from typegraph.utils.sanitizers import sanitize_ts_string


def policy_name_factory():
    tg = TypegraphContext.get_active()
    if tg is None:
        raise Exception("typegraph context needed")
    return f"policy_{tg.next_type_id()}"


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
    def get_from(cls, p) -> "Policy":
        if isinstance(p, Materializer):
            return cls(p)
        if isinstance(p, cls):
            return p
        raise Exception(f"Cannot create Policy from a {type(p).__name__}")


def public(name: str = "__public"):
    return Policy(PureFunMat("() => true")).named(name)


def jwt(role_name: str, field: str = "role"):
    # join role_name, field with '__jwt' as prefix
    separator, pattern = "_", r"[^a-zA-Z0-9_]+"
    prefix = "__jwt"
    jwt_name = reg_sub(pattern, separator, separator.join([prefix, role_name, field]))
    # build the policy
    role_name = sanitize_ts_string(role_name)
    field = sanitize_ts_string(field)
    src = f"""
            (_, {{ context }}) => {{
                const role_chunks = "{role_name}".split(".");
                let value = context?.[role_chunks.shift()];
                for (const chunk of role_chunks)
                    value = value?.[chunk];
                return value === "{field}";
            }}
        """
    return Policy(PureFunMat(src)).named(jwt_name)


def internal():
    # https://metatype.atlassian.net/browse/MET-107
    return Policy(PureFunMat("() => false")).named("internal")
