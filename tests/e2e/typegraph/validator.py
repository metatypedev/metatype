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

    parents = t.struct(
        {
            "a": t.integer(),
            "b": t.string(max=20),
            "c": t.struct({"a": t.integer(), "b": t.integer().optional()}),
            "d": t.list(t.integer()),
        }
    )

    g.expose(
        test=deno.identity(injection),
        testEnums=deno.identity(enums),
        testFromParent=deno.identity(parents).extend(
            {
                "nested": deno.func(
                    t.struct(
                        {
                            "a": t.string().from_parent("a"),
                            "b": t.string(min=12, max=16).from_parent("b"),
                            "c": t.struct(
                                {"a": t.integer(), "c": t.boolean().optional()}
                            ).from_parent("c"),
                            "d": t.list(t.integer()).from_parent("d"),
                        }
                    ),
                    t.struct(),
                    code="() => ({})",
                ),
            }
        ),
    )
