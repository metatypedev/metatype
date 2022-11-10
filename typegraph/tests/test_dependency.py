# Copyright Metatype under the Elastic License 2.0.

import frozendict
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeMeta
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypeRuntime
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
                                "a1": t.integer().s_parent(g("a")),
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
                                "output": 3,
                            }
                        ),
                    ),
                    TypeNode(
                        name="no_arg",
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
                        name="res",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict({"b": 4, "a": 7}),
                            }
                        ),
                    ),
                    TypeNode(
                        name="dep_a",
                        typedef="func",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "rate_weight": None,
                                "rate_calls": False,
                                "materializer": 0,
                                "input": 5,
                                "output": 9,
                            }
                        ),
                    ),
                    TypeNode(
                        name="deps",
                        typedef="struct",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "renames": frozendict.frozendict({}),
                                "binds": frozendict.frozendict(
                                    {"a1": 6, "a2": 7, "new": 8}
                                ),
                            }
                        ),
                    ),
                    TypeNode(
                        name="integer_2",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"inject": 7, "injection": "parent"}
                        ),
                    ),
                    TypeNode(
                        name="a",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="new",
                        typedef="integer",
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="integer_5",
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
                            {"serial": False, "script": "var _my_lambda = x2;"}
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
