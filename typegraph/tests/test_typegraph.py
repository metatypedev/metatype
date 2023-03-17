# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import frozendict

from typegraph import TypeGraph, t
from typegraph import policies as p
from typegraph.graph.models import Cors
from typegraph.runtimes.deno import PureFunMat


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
            g.expose(
                test=t.func(
                    inp,
                    out,
                    PureFunMat("(args) => args.a * 2"),
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
                        "output": 4,
                        "materializer": 0,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "inp",
                        "properties": {"a": 3},
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "arg1"},
                    {"runtime": 0, "policies": [], "type": "integer", "title": "out"},
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
                        "effect": {"effect": None, "idempotent": True},
                        "data": {"script": "var _my_lambda = (args) => args.a * 2;"},
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
                        max_age_sec=None,
                    ),
                    "version": "0.0.1",
                },
                "$id": "https://metatype.dev/specs/0.0.1.json",
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
                            PureFunMat("() => 1"),
                        ).named("compute_duration"),
                        "self": g("f"),
                        "nested": t.struct({"ok": out, "self": g("f")}).named("nested"),
                    }
                ).named("res"),
                PureFunMat("(args) => args.a"),
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
                        "output": 4,
                        "materializer": 1,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "inp",
                        "properties": {"a": 3},
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "arg1"},
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "res",
                        "properties": {"out": 5, "duration": 6, "self": 1, "nested": 9},
                    },
                    {"runtime": 0, "policies": [], "type": "integer", "title": "out"},
                    {
                        "runtime": 0,
                        "policies": [],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "compute_duration",
                        "input": 7,
                        "output": 8,
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
                        "properties": {"ok": 5, "self": 1},
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
                        "effect": {"effect": None, "idempotent": True},
                        "data": {"script": "var _my_lambda = () => 1;"},
                    },
                    {
                        "name": "function",
                        "runtime": 0,
                        "effect": {"effect": None, "idempotent": True},
                        "data": {"script": "var _my_lambda = (args) => args.a;"},
                    },
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
                        max_age_sec=None,
                    ),
                    "version": "0.0.1",
                },
                "$id": "https://metatype.dev/specs/0.0.1.json",
            }
        )

    def test_policy_for_effects(self, overridable):
        with TypeGraph("policy_for_effects") as g:
            public = p.public()

            g.expose(
                test=t.func(t.struct(), t.integer(), PureFunMat("() => 1")).add_policy(
                    {
                        "none": public,
                        "update": public,
                        "create": public,
                    }
                )
            )

        assert g.build() == overridable(
            {
                "types": [
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "policy_for_effects",
                        "properties": {"test": 1},
                    },
                    {
                        "runtime": 0,
                        "policies": [{"none": 0, "create": 0, "update": 0}],
                        "safe": True,
                        "rate_calls": False,
                        "type": "function",
                        "title": "function_4",
                        "input": 2,
                        "output": 3,
                        "materializer": 1,
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "object",
                        "title": "object_2",
                        "properties": {},
                    },
                    {
                        "runtime": 0,
                        "policies": [],
                        "type": "integer",
                        "title": "integer_3",
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
                        "effect": {"effect": None, "idempotent": True},
                        "data": {"script": "var _my_lambda = () => true;"},
                    },
                    {
                        "name": "function",
                        "runtime": 0,
                        "effect": {"effect": None, "idempotent": True},
                        "data": {"script": "var _my_lambda = () => 1;"},
                    },
                ],
                "policies": [{"name": "__public", "materializer": 0}],
                "meta": {
                    "secrets": [],
                    "auths": [],
                    "rate": None,
                    "cors": Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age_sec=None,
                    ),
                    "version": "0.0.1",
                },
                "$id": "https://metatype.dev/specs/0.0.1.json",
            }
        )
