# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from re import Pattern
from typing import List, Optional, Union

from typegraph.gen.exports.core import (
    ContextCheckPattern,
    ContextCheckValue,
    ContextCheckNotNull,
    Err,
    MaterializerId,
    PolicySpecPerEffect,
    PolicySpecSimple,
)
from typegraph.gen.exports.core import (
    Policy as WitPolicy,
)
from typegraph.gen.exports.core import (
    PolicyPerEffect as WitPolicyPerEffect,
)
from typegraph.gen.exports.core import (
    PolicySpec as WitPolicySpec,
)
from typegraph.wit import core, store


class Policy:
    id: int
    name: str

    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name

    @classmethod
    def public(cls):
        """
        Public access
        """
        res = core.get_public_policy(store)
        if isinstance(res, Err):
            raise Exception(res.value)
        return cls(id=res.value[0], name=res.value[1])

    @classmethod
    def context(cls, key: str, check: Optional[Union[str, Pattern]] = None) -> "Policy":
        if check is None:
            res = core.register_context_policy(store, key, ContextCheckNotNull())
        elif isinstance(check, str):
            res = core.register_context_policy(store, key, ContextCheckValue(check))
        else:
            res = core.register_context_policy(
                store, key, ContextCheckPattern(check.pattern)
            )

        if isinstance(res, Err):
            raise Exception(res.value)

        (policy_id, name) = res.value
        return cls(id=policy_id, name=name)

    @classmethod
    def internal(cls) -> "Policy":
        res = core.get_internal_policy(store)
        if isinstance(res, Err):
            raise Exception(res.value)
        return cls(id=res.value[0], name=res.value[1])

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
        read: Optional["Policy"] = None,
    ) -> "PolicyPerEffect":
        return PolicyPerEffect(create=create, update=update, delete=delete, read=read)


@dataclass
class PolicyPerEffect:
    create: Optional[Policy] = None
    update: Optional[Policy] = None
    delete: Optional[Policy] = None
    read: Optional[Policy] = None


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
                read=p.read and p.read.id,
            )
        )
        for p in policies
    ]
