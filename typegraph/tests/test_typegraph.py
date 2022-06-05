import frozendict
from typegraph.graphs.builders import Graph
from typegraph.graphs.builders import TypeMaterializer
from typegraph.graphs.builders import TypeNode
from typegraph.graphs.builders import TypeRuntime
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.materializers import worker
from typegraph.materializers.deno import DenoRuntime
from typegraph.materializers.worker import WorkerRuntime
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
            g.expose(test=t.func(inp, out, deno.FunMat("x2")).named("f"))

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
                        edges=(2, 4),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 4}
                        ),
                    ),
                    TypeNode(
                        name="inp",
                        typedef="struct",
                        edges=(3,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"a": 3})}
                        ),
                    ),
                    TypeNode(
                        name="arg1",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="out",
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
                            worker.JavascriptMat("() => 1", "f"),
                        ).named("compute_duration"),
                        "self": g("f"),
                        "nested": t.struct({"ok": out, "self": g("f")}).named("nested"),
                    }
                ).named("res"),
                deno.FunMat("getter"),
            ).named("f")
            g.expose(test=getter)

        print()
        print(g.build())
        print()
        assert g.build() == overridable(
            Graph(
                types=[
                    TypeNode(
                        name="two_runtimes",
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
                        edges=(2, 4),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"materializer": 0, "input": 2, "output": 4}
                        ),
                    ),
                    TypeNode(
                        name="inp",
                        typedef="struct",
                        edges=(3,),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"a": 3})}
                        ),
                    ),
                    TypeNode(
                        name="arg1",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="res",
                        typedef="struct",
                        edges=(5, 6, 1, 9),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "binds": frozendict.frozendict(
                                    {"out": 5, "duration": 6, "self": 1, "nested": 9}
                                )
                            }
                        ),
                    ),
                    TypeNode(
                        name="out",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="compute_duration",
                        typedef="gen",
                        edges=(7, 8),
                        policies=(),
                        runtime=1,
                        data=frozendict.frozendict(
                            {"materializer": 1, "input": 7, "output": 8}
                        ),
                    ),
                    TypeNode(
                        name="struct_4568798960",
                        typedef="struct",
                        edges=(),
                        policies=(),
                        runtime=1,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({})}
                        ),
                    ),
                    TypeNode(
                        name="duration",
                        typedef="integer",
                        edges=(),
                        policies=(),
                        runtime=1,
                        data=frozendict.frozendict({}),
                    ),
                    TypeNode(
                        name="nested",
                        typedef="struct",
                        edges=(5, 1),
                        policies=(),
                        runtime=0,
                        data=frozendict.frozendict(
                            {"binds": frozendict.frozendict({"ok": 5, "self": 1})}
                        ),
                    ),
                ],
                materializers=[
                    TypeMaterializer(
                        name="function",
                        runtime=0,
                        data=frozendict.frozendict(
                            {
                                "runtime": DenoRuntime(runtime_name="deno"),
                                "name": "getter",
                            }
                        ),
                    ),
                    TypeMaterializer(
                        name="f",
                        runtime=1,
                        data=frozendict.frozendict(
                            {
                                "runtime": WorkerRuntime(runtime_name="worker"),
                                "code": "() => 1",
                            }
                        ),
                    ),
                ],
                runtimes=[
                    TypeRuntime(name="deno", data=frozendict.frozendict({})),
                    TypeRuntime(name="worker", data=frozendict.frozendict({})),
                ],
                policies=[],
            )
        )
