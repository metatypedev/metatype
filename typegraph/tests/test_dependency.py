# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import frozendict
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.models import Cors
from typegraph.runtimes import deno


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
                        "properties": {"test": 1},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "f",
                        "input": 2,
                        "output": 3,
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
                        "properties": {"b": 4, "a": 7},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "dep_a",
                        "input": 5,
                        "output": 9,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "deps",
                        "properties": {"a1": 6, "a2": 7, "new": 8},
                    },
                    {
                        "runtime": 0,
                        "inject": 7,
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
                        "effect": None,
                        "idempotent": True,
                        "data": {"script": "var _my_lambda = x2;"},
                    }
                ],
                "policies": [],
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
                "$id": "https://metatype.dev/specs/0.0.1.json",
            }
        )
