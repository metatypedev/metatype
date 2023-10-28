from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def test_reduce_python(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    simple_tpe = t.struct(
        {
            "one": t.union([t.string(), t.integer()]).optional(),
            "two": t.struct(
                {
                    "reduce": t.integer(),
                    "user": t.integer(),
                    "set": t.integer().optional(),
                    "context": t.string().optional(),
                }
            ).optional(),
            "branching": t.union(
                [
                    # *.a.b
                    t.struct({"a": t.struct({"b": t.string()})}, name="V1"),
                    # *.a.b.c
                    #      .d
                    t.struct(
                        {
                            "a": t.struct(
                                {
                                    "b": t.union(
                                        [
                                            t.struct({"c": t.string()}, name="A"),
                                            t.struct(
                                                {"c": t.string(), "d": t.string()},
                                                name="B",
                                            ),
                                        ]
                                    )
                                }
                            )
                        },
                        name="V2",
                    ),
                ]
            ).optional(),
        }
    )

    self_ref_tpe = t.struct(
        {
            "a": t.string(),
            "b": t.struct({"nested": g.ref("SelfRef")}).optional(),
            "direct": g.ref("SelfRef").optional(),
        },
        name="SelfRef",
    )

    identity_simple = deno.func(
        simple_tpe, simple_tpe, code="({ one, two }) => { return { one, two } }"
    )

    identity_self_ref = deno.func(
        self_ref_tpe, self_ref_tpe, code="({ a, b }) => { return { a, b } }"
    )

    g.expose(
        invariantReduce=identity_simple.reduce(
            {
                "two": {
                    "reduce": g.inherit(),
                    "user": g.inherit(),
                    "set": g.inherit(),
                    "context": g.inherit(),
                }
                # "one": g.inherit()  # implicit
            }
        ).with_policy(public),
        simpleInjection=identity_simple.reduce({"one": "ONE!"})
        .reduce(
            {
                "two": {
                    "user": g.inherit(),
                    "set": g.inherit().set(2),
                    "context": g.inherit().from_context("someValue"),
                },
            }
        )
        .with_policy(public),
        testBranching=identity_simple.reduce(
            {"branching": {"a": {"b": {"c": "nested"}}}}
        ).with_policy(public),
        selfReferingType=identity_self_ref.reduce(
            {
                "a": g.inherit(),  # A1
                "b": {
                    "nested": {
                        "a": "A2",
                        "b": {
                            "nested": {
                                "a": g.inherit(),  # A3
                                "b": g.inherit().from_context("nestedB"),
                                "direct": {"a": "direct A3"},
                            }
                        },
                    }
                },
            }
        ).with_policy(public),
    )
