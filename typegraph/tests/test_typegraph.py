# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import frozendict
from typegraph.graphs.typegraph import Cors
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import types as t


class TestTypegraph:

    # def test_register_struct(self) -> None:

    #     with TypeGraph("") as g:

    #         o1 = t.string()
    #         o2 = t.struct({"name": o1})

    #     assert g.types == [o1.props, o1, o2]

    # def test_register_enum(self) -> None:

    #     with TypeGraph("") as g:

    #         o1 = t.enum(["A", "B"])

    #     assert g.types == [o1]

    def test_build_single_runtime(self, overridable) -> None:

        with TypeGraph("single_runtime") as g:
            arg1 = t.integer().named("arg1")
            inp = t.struct({"a": arg1}).named("inp")
            out = t.integer().named("out")
            g.expose(test=t.func(inp, out, FunMat("(args) => args.a * 2")).named("f"))

        assert g.build() == overridable(
            {
                "types": [
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "single_runtime",
                        "properties": {"query": 1, "mutation": 6},
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
                        "output": 5,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "inp",
                        "properties": {"a": 4},
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "arg1"},
                    {"runtime": 0, "policies": [], "type": "integer", "title": "out"},
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
                        "data": {
                            "serial": False,
                            "script": "var _my_lambda = (args) => args.a * 2;",
                        },
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

    def test_build_two_runtimes(self, overridable) -> None:

        with TypeGraph("two_runtimes") as g:
            out = t.integer().named("out")
            getter = t.func(
                t.struct({"a": t.integer().named("arg1")}).named("inp"),
                t.struct(
                    {
                        "out": out,
                        "duration": t.gen(
                            t.integer().named("duration"),
                            FunMat("() => 1"),
                        ).named("compute_duration"),
                        "self": g("f"),
                        "nested": t.struct({"ok": out, "self": g("f")}).named("nested"),
                    }
                ).named("res"),
                FunMat("(args) => args.a"),
            ).named("f")
            g.expose(test=getter)

        assert g.build() == overridable(
            {
                "types": [
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "two_runtimes",
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
                        "output": 5,
                        "materializer": 1,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "inp",
                        "properties": {"a": 4},
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "arg1"},
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "res",
                        "properties": {
                            "out": 6,
                            "duration": 7,
                            "self": 2,
                            "nested": 10,
                        },
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "out"},
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "compute_duration",
                        "input": 8,
                        "output": 9,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "object_5",
                        "properties": {},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "duration",
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "nested",
                        "properties": {"ok": 6, "self": 2},
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
                        "data": {
                            "serial": False,
                            "script": "var _my_lambda = () => 1;",
                        },
                    },
                    {
                        "name": "function",
                        "runtime": 0,
                        "data": {
                            "serial": False,
                            "script": "var _my_lambda = (args) => args.a;",
                        },
                    },
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
