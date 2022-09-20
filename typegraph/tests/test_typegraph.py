# Copyright Metatype under the Elastic License 2.0.

import frozendict
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeMeta
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypeRuntime
from typegraph.graphs.typegraph import Cors
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.types import typedefs as t


class TestTypegraph:
    def test_register_struct(self) -> None:

        with TypeGraph("") as g:

            o1 = t.string()
            o2 = t.struct({"name": o1})

        assert g.types == [o1.of, o1, o2]

    def test_register_enum(self) -> None:

        with TypeGraph("") as g:

            o1 = t.enum(["A", "B"])

        assert g.types == [o1]

    def test_build_single_runtime(self, overridable) -> None:

        with TypeGraph("single_runtime") as g:
            arg1 = t.integer().named("arg1")
            inp = t.struct({"a": arg1}).named("inp")
            out = t.integer().named("out")
            g.expose(test=t.func(inp, out, FunMat("(args) => args.a * 2")).named("f"))

        assert g.build() == overridable(
            Graph(
                types=[
                    TypeNode(
                        name="single_runtime",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"test": 1}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="f",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "rate_weight": None,
                                "rate_calls": False,
                                "materializer": 0,
                                "input": 2,
                                "output": 4,
                            }
                        ),
                    ),
                    TypeNode(
                        name="inp",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"a": 3}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="arg1",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="out",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                ],
                materializers=[
                    TypeMaterializer(
                        name="function",
                        runtime=0,
                        data=frozendict.frozendict(
                            {"serial": False, "fn_expr": "(args) => args.a * 2"}
                        ),
                    )
                ],
                runtimes=[
                    TypeRuntime(
                        name="deno", data=frozendict.frozendict({"worker": "default"})
                    )
                ],
                policies=[],
                meta=TypeMeta(
                    secrets=[],
                    cors=Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age=None,
                    ),
                    auths=[],
                    rate=[],
                    version="0.0.1",
                ),
            )
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
            Graph(
                types=[
                    TypeNode(
                        name="two_runtimes",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"test": 1}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="f",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "rate_weight": None,
                                "rate_calls": False,
                                "materializer": 0,
                                "input": 2,
                                "output": 4,
                            }
                        ),
                    ),
                    TypeNode(
                        name="inp",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"a": 3}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="arg1",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="res",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"out": 5, "duration": 6, "self": 1, "nested": 9}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="out",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="compute_duration",
                        typedef="gen",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "rate_weight": None,
                                "rate_calls": False,
                                "materializer": 1,
                                "input": 7,
                                "output": 8,
                            }
                        ),
                    ),
                    TypeNode(
                        name="struct_5",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="duration",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="nested",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"ok": 5, "self": 1}),
                            }
                        ),
                    ),
                ],
                materializers=[
                    TypeMaterializer(
                        name="function",
                        runtime=0,
                        data=frozendict.frozendict(
                            {"serial": False, "fn_expr": "(args) => args.a"}
                        ),
                    ),
                    TypeMaterializer(
                        name="function",
                        runtime=0,
                        data=frozendict.frozendict(
                            {"serial": False, "fn_expr": "() => 1"}
                        ),
                    ),
                ],
                runtimes=[
                    TypeRuntime(
                        name="deno", data=frozendict.frozendict({"worker": "default"})
                    )
                ],
                policies=[],
                meta=TypeMeta(
                    secrets=[],
                    cors=Cors(
                        allow_origin=[],
                        allow_headers=[],
                        expose_headers=[],
                        allow_credentials=True,
                        max_age=None,
                    ),
                    auths=[],
                    rate=[],
                    version="0.0.1",
                ),
            )
        )
