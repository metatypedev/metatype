# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.gen.exports.core import (
    PolicySpecSimple,
    TypeInteger,
    TypeStruct,
    TypeFunc,
    TypeBase,
    TypeProxy,
    TypePolicy,
    PolicyPerEffect as WitPolicyPerEffect,
    PolicySpecPerEffect,
)
from typegraph.gen.types import Err
from typing import Optional, Dict, Union, Tuple
from typing_extensions import Self
from typegraph.graph.typegraph import core, store
from typegraph.runtimes.deno import Materializer
from typegraph.policy import Policy, PolicyPerEffect


class typedef:
    id: int

    def __init__(self, id: int):
        self.id = id

    def __repr__(self):
        res = core.get_type_repr(store, self.id)
        if isinstance(res, Err):
            raise Exception(res.value)
        return res.value

    def with_policy(self, *policies: Union[Policy, PolicyPerEffect]) -> Self:
        res = core.with_policy(
            store,
            TypePolicy(
                tpe=self.id,
                chain=[
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
                ],
            ),
        )

        if isinstance(res, Err):
            raise Exception(res.value)

        return _TypeWithPolicy(res.value, self, policies)


class _TypeWithPolicy(typedef):
    base: "typedef"
    policy: Tuple[Union[Policy, PolicyPerEffect], ...]

    def __init__(
        self,
        id: int,
        base: "typedef",
        policy: Tuple[Union[Policy, PolicyPerEffect], ...],
    ):
        super().__init__(id)
        self.base = base
        self.policy = policy

    def __getattr__(self, name):
        if name == "policy":
            return self.policy
        return getattr(self.base, name)


class ref(typedef):
    name: str

    def __init__(self, name: str):
        res = core.proxyb(store, TypeProxy(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.name = name


class integer(typedef):
    min: Optional[int] = None
    max: Optional[int] = None

    def __init__(
        self,
        *,
        min: Optional[int] = None,
        max: Optional[int] = None,
        name: Optional[str] = None
    ):
        data = TypeInteger(min=min, max=max)
        res = core.integerb(store, data, TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.min = min
        self.max = max


class struct(typedef):
    props: Dict[str, typedef]

    def __init__(self, props: Dict[str, typedef], *, name: Optional[str] = None):
        data = TypeStruct(props=list((name, tpe.id) for (name, tpe) in props.items()))

        res = core.structb(store, data, base=TypeBase(name=name))
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.props = props


class func(typedef):
    inp: struct
    out: typedef
    mat: Materializer

    def __init__(self, inp: struct, out: typedef, mat: Materializer):
        data = TypeFunc(inp=inp.id, out=out.id, mat=mat.id)
        res = core.funcb(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        id = res.value
        super().__init__(id)
        self.inp = inp
        self.out = out
