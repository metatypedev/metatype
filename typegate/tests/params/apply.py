from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def test_apply(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        public,
        renamed=deno.identity(t.struct({"a": t.integer(), "b": t.integer()})).apply(
            {
                "a": g.as_arg("first"),
                "b": g.as_arg("second"),
            }
        ),
        flattened=deno.identity(
            t.struct(
                {
                    "a": t.struct(
                        {
                            "a1": t.integer(),
                            "a2": t.integer(),
                        }
                    ),
                    "b": t.struct(
                        {
                            "b1": t.struct(
                                {
                                    "b11": t.integer(),
                                    "b12": t.integer(),
                                }
                            ),
                            "b2": t.integer(),
                        }
                    ),
                }
            )
        ).apply(
            {
                "a": {
                    "a1": g.as_arg("a1"),
                    "a2": g.as_arg("a2"),
                },
                "b": {
                    "b1": {
                        "b11": g.as_arg("b11"),
                        "b12": g.as_arg("b12"),
                    },
                    "b2": g.as_arg("b2"),
                },
            }
        ),
        withContext=deno.identity(t.struct({"a": t.integer(), "b": t.string()})).apply(
            {
                "a": g.as_arg("first"),
                "b": g.from_context("context_key"),
            },
        ),
        withSecret=deno.identity(t.struct({"a": t.integer(), "b": t.string()})).apply(
            {
                "a": g.as_arg("first"),
                "b": g.from_secret("MY_SECRET"),
            }
        ),
        withParent=deno.func(
            t.struct(),
            t.struct(
                {
                    "a": t.integer(name="A"),
                    "b": deno.identity(
                        t.struct({"b1": t.integer(), "b2": t.integer()})
                    ).apply(
                        {
                            "b1": g.as_arg("b1"),
                            "b2": g.from_parent("A"),
                        }
                    ),
                }
            ),
            code="""() => ({ a: 1 })""",
        ),
        withArray=deno.identity(
            t.struct(
                {
                    "a": t.list(t.integer()),
                }
            )
        ).apply(
            {
                "a": [
                    g.as_arg("first"),
                    g.as_arg("second"),
                ]
            }
        ),
        withNestedArrays=deno.identity(
            t.struct(
                {
                    "a": t.list(t.list(t.integer())),
                }
            )
        ).apply(
            {
                "a": [
                    [g.as_arg("first")],
                    g.as_arg("second"),
                ]
            }
        ),
        withArrayOfObjects=deno.identity(
            t.struct(
                {
                    "a": t.list(t.struct({"b": t.integer()})),
                }
            )
        ).apply(
            {
                "a": [
                    {"b": g.as_arg("first")},
                    g.as_arg("second"),
                ]
            }
        ),
        contextToUnionType=deno.identity(
            t.struct(
                {
                    "a": t.union([t.integer(), t.string()]),
                }
            )
        ).apply({"a": g.from_context("context_key")}),
    )
