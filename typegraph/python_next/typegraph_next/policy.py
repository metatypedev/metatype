# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from re import Pattern
from typing import Optional, Union, List

from typegraph_next.gen.exports.core import (
    ContextCheckPattern,
    ContextCheckValue,
    Err,
    MaterializerId,
    PolicySpecPerEffect,
)
from typegraph_next.gen.exports.core import (
    Policy as WitPolicy,
    PolicySpec as WitPolicySpec,
    PolicySpecSimple,
    PolicySpecPerEffect as WitPolicyPerEffect,
)
from typegraph_next.gen.exports.runtimes import MaterializerDenoPredefined
from typegraph_next.wit import core, runtimes, store


class Policy:
    id: int
    name: str

    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name

    @classmethod
    def public(cls):
        res = runtimes.get_predefined_deno_func(
            store, MaterializerDenoPredefined(name="true")
        )
        if isinstance(res, Err):
            raise Exception(res.value)
        mat_id = res.value

        return cls.create("__public", mat_id)

    @classmethod
    def context(cls, key: str, check: Union[str, Pattern]) -> "Policy":
        if isinstance(check, str):
            res = core.register_context_policy(store, key, ContextCheckValue(check))
        else:
            res = core.register_context_policy(
                store, key, ContextCheckPattern(check.pattern)
            )

        if isinstance(res, Err):
            raise Exception(res.value)

        (policy_id, name) = res.value
        return cls(id=policy_id, name=name)

    # TODO implement in Rust for the Guest wasm
    @classmethod
    def internal(cls) -> "Policy":
        from typegraph_next.runtimes.deno import DenoRuntime

        return DenoRuntime().policy(
            "__internal", "(_, { context }) => context.provider === 'internal'"
        )

    @classmethod
    def create(cls, name: str, mat_id: MaterializerId) -> "Policy":
        res = core.register_policy(store, WitPolicy(name=name, materializer=mat_id))
        if isinstance(res, Err):
            raise Exception(res.value)

        return cls(id=res.value, name=name)

    @classmethod
    def on(
        cls,
        *,
        update: Optional["Policy"] = None,
        delete: Optional["Policy"] = None,
        create: Optional["Policy"] = None,
        none: Optional["Policy"] = None,
    ) -> "PolicyPerEffect":
        return PolicyPerEffect(create=create, update=update, delete=delete, none=none)


@dataclass
class PolicyPerEffect:
    create: Optional[Policy] = None
    update: Optional[Policy] = None
    delete: Optional[Policy] = None
    none: Optional[Policy] = None


SinglePolicySpec = Union[Policy, PolicyPerEffect]

PolicySpec = Union[SinglePolicySpec, List[SinglePolicySpec]]


def get_policy_chain(policies: PolicySpec) -> List[WitPolicySpec]:
    if not isinstance(policies, list) and not isinstance(policies, tuple):
        policies = (policies,)

    return [
        PolicySpecSimple(value=p.id)
        if isinstance(p, Policy)
        else PolicySpecPerEffect(
            value=WitPolicyPerEffect(
                create=p.create and p.create.id,
                update=p.update and p.update.id,
                delete=p.delete and p.delete.id,
                none=p.none and p.none.id,
            )
        )
        for p in policies
    ]
