# Copyright Metatype under the Elastic License 2.0.

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
                        "type": "object",
                        "title": "single_runtime",
                        "runtime": 0,
                        "policies": [],
                        "properties": {"query": 1, "mutation": 11},
                    },
                    {
                        "type": "object",
                        "title": "QueryType",
                        "runtime": 0,
                        "policies": [],
                        "properties": {"test": 2},
                    },
                    {
                        "type": "function",
                        "title": "f",
                        "runtime": 0,
                        "policies": [],
                        "input": 3,
                        "output": 4,
                        "materializer": 0,
                        "rate_weight": None,
                        "rate_calls": False,
                    },
                    {
                        "type": "object",
                        "title": "no_arg",
                        "runtime": 0,
                        "policies": [],
                        "properties": {},
                    },
                    {
                        "type": "object",
                        "title": "res",
                        "runtime": 0,
                        "policies": [],
                        "properties": {"b": 5, "a": 8},
                    },
                    {
                        "type": "function",
                        "title": "dep_a",
                        "runtime": 0,
                        "policies": [],
                        "input": 6,
                        "output": 10,
                        "materializer": 0,
                        "rate_weight": None,
                        "rate_calls": False,
                    },
                    {
                        "type": "object",
                        "title": "deps",
                        "runtime": 0,
                        "policies": [],
                        "properties": {"a1": 7, "a2": 8, "new": 9},
                    },
                    {
                        "type": "integer",
                        "title": "integer_2",
                        "runtime": 0,
                        "policies": [],
                        "injection": "parent",
                        "inject": 8,
                    },
                    {"type": "integer", "title": "a", "runtime": 0, "policies": []},
                    {"type": "integer", "title": "new", "runtime": 0, "policies": []},
                    {
                        "type": "integer",
                        "title": "integer_5",
                        "runtime": 0,
                        "policies": [],
                    },
                    {
                        "type": "object",
                        "title": "MutationType",
                        "runtime": 0,
                        "policies": [],
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
