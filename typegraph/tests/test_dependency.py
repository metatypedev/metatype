import frozendict
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypeRuntime
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.materializers.deno import DenoRuntime
from typegraph.types import typedefs as t


class TestDependency:
    def test_simple_dep(self, overridable) -> None:

        with TypeGraph("single_runtime") as g:
            a = t.integer().named("a")
            res = t.struct(
                {
                    "b": t.func(
                        t.struct(
                            {
                                "a1": a.inject,
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
                        edges=(1,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"test": 1})}
                        ),
                    ),
                    TypeNode(
                        name="f",
                        typedef="func",
                        edges=(2, 3),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 3}
                        ),
                    ),
                    TypeNode(
                        name="no_arg",
                        typedef="struct",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({})}
                        ),
                    ),
                    TypeNode(
                        name="res",
                        typedef="struct",
                        edges=(4, 6),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"b": 4, "a": 6})}
                        ),
                    ),
                    TypeNode(
                        name="dep_a",
                        typedef="func",
                        edges=(5, 8),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 5, "output": 8}
                        ),
                    ),
                    TypeNode(
                        name="deps",
                        typedef="struct",
                        edges=(6, 6, 7),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "binds": frozendict.frozendict(
                                    {"a1": 6, "a2": 6, "new": 7}
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="a",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="new",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="integer_4487460080",
                        typedef="integer",
                        edges=(),
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
                            {"runtime": DenoRuntime(runtime_name="deno"), "name": "x2"}
                        ),
                    )
                ],
                runtimes=[TypeRuntime(name="deno", data=frozendict.frozendict({}))],
                policies=[],
            )
        )
