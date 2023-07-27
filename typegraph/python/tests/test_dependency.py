# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import frozendict

from typegraph import TypeGraph, t
from typegraph.graph.models import Cors
from typegraph.runtimes import deno
from typegraph.effects import EffectType


class TestDependency:
    def test_simple_dep(self, overridable) -> None:
        with TypeGraph("single_runtime") as g:
            a = t.integer().named("a")
            res = t.struct(
                {
                    "b": t.func(
                        t.struct(
                            {
                                "a1": t.integer().from_parent(g("a")),
                                "a2": g("a"),
                                "new": t.integer().named("new"),
                            }
                        ).named("deps"),
                        t.integer(),
                        deno.PureFunMat("x2"),
                    ).named("dep_a"),
                    "a": a,
                }
            ).named("res")
            g.expose(
                test=t.func(
                    t.struct({}).named("no_arg"),
                    res,
                    deno.PureFunMat("x2"),
                ).named("f")
            )

        assert g.build() == overridable(
            {
                "types": [
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "single_runtime",
                        "as_id": False,
                        "properties": {"test": 1},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "f",
                        "as_id": False,
                        "input": 2,
                        "output": 3,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "no_arg",
                        "as_id": False,
                        "properties": {},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "res",
                        "as_id": False,
                        "properties": {"b": 4, "a": 7},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "dep_a",
                        "as_id": False,
                        "input": 5,
                        "output": 9,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "deps",
                        "as_id": False,
                        "properties": {"a1": 6, "a2": 7, "new": 8},
                    },
                    {
                        "runtime": 0,
                        "injection": frozendict.frozendict(
                            {
                                "source": "parent",
                                "data": frozendict.frozendict({"value": 7}),
                            }
                        ),
                        "policies": [],
                        "type": "integer",
                        "title": "integer_2",
                        "as_id": False,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "a",
                        "as_id": False,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "new",
                        "as_id": False,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "integer_5",
                        "as_id": False,
                    },
                ],
                "runtimes": [
                    {
                        "name": "deno",
                        "data": {
                            "worker": "default",
                            "permissions": frozendict.frozendict({}),
                        },
                    }
                ],
                "materializers": [
                    {
                        "name": "function",
                        "runtime": 0,
                        "effect": {"effect": EffectType.NONE, "idempotent": True},
                        "data": {"script": "var _my_lambda = x2;"},
                    }
                ],
                "policies": [],
                "meta": {
                    "secrets": [],
                    "queries": {"dynamic": True, "endpoints": []},
                    "auths": [],
                    "rate": None,
                    "cors": Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age_sec=None,
                    ),
                    "version": "0.0.2",
                },
                "$id": "https://metatype.dev/specs/0.0.2.json",
            }
        )
