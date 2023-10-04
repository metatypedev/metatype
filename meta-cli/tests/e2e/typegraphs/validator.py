from typegraph import typegraph, t, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def validator(g: Graph):
    deno = DenoRuntime()

    injection = t.struct(
        {
            "a": t.integer().set("1"),
            "b": t.string().set(["h", "e", "l", "l", "o"]),
            "c": t.integer(min=2).set(0),
            "d": t.string(max=4).set("hello"),
            "e": t.struct({"a": t.integer()}).set({}),
            "f": t.struct({"a": t.integer()}).set({"b": 1}),
            "g": t.struct({"a": t.integer()}).set({"a": 2, "b": 1}),
        }
    )

    enums = t.struct(
        {
            "a": t.string(min=4, enum=["hi", "hello", 12]),
            "b": t.struct(
                {"name": t.string(), "age": t.float()},
                enum=[{"name": "John", "age": "13"}],
            ),
            "c": t.integer(enum=[1, 3, 5]).optional(),
        }
    )

    g.expose(
        test=deno.identity(injection),
        testEnums=deno.identity(enums),
    )
