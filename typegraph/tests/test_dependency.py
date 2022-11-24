# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import frozendict
from typegraph.graphs.typegraph import Cors
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.types import types as t


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
                        deno.FunMat("x2"),
                    ).named("dep_a"),
                    "a": a,
                }
            ).named("res")
            g.expose(
                test=t.func(t.struct({}).named("no_arg"), res, deno.FunMat("x2")).named(
                    "f"
                )
            )

        assert g.build() == overridable(
            {
                "types": [
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "single_runtime",
                        "properties": {"query": 1, "mutation": 11},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "Query",
                        "properties": {"test": 2},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "f",
                        "input": 3,
                        "output": 4,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "no_arg",
                        "properties": {},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "res",
                        "properties": {"b": 5, "a": 8},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "dep_a",
                        "input": 6,
                        "output": 10,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "deps",
                        "properties": {"a1": 7, "a2": 8, "new": 9},
                    },
                    {
                        "runtime": 0,
                        "inject": 8,
                        "injection": "parent",
                        "policies": [],
                        "type": "integer",
                        "title": "integer_2",
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "a"},
                    {"runtime": 0, "policies": [], "type": "integer", "title": "new"},
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "integer_5",
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "Mutation",
                        "properties": {},
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
                        "data": {"serial": False, "script": "var _my_lambda = x2;"},
                    }
                ],
                "meta": {
                    "secrets": [],
                    "auths": [],
                    "rate": None,
                    "cors": Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age=None,
                    ),
                    "version": "0.0.1",
                },
            }
        )
