from typegraph import t, typegraph, Policy, Graph
from typegraph.runtimes.deno import DenoRuntime

simple_tpe = t.struct(
    {
        "one": t.string(),
        "two": t.struct(
            {
                "apply": t.integer(),
                "user": t.integer(),
                "set": t.integer().optional(),
                "context": t.string().optional(),
            }
        ),
    }
)


self_ref_tpe = t.struct(
    {
        "a": t.string(),
        "b": t.struct({"nested": t.ref("SelfRef")}).optional(),
        "direct": t.ref("SelfRef").optional(),
    },
    name="SelfRef",
)


@typegraph()
def test_apply_python(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    identity_simple = deno.func(
        simple_tpe, simple_tpe, code="({ one, two }) => { return { one, two } }"
    )

    identity_self_ref = deno.func(
        self_ref_tpe, self_ref_tpe, code="({ a, b }) => { return { a, b } }"
    )

    g.expose(
        invariantApply=identity_simple.apply(
            {
                "two": {
                    "apply": g.inherit(),
                    "user": g.inherit(),
                    "set": g.inherit(),
                    "context": g.inherit(),
                }
                # "one": g.inherit()  # implicit
            }
        ).with_policy(public),
        simpleInjection=identity_simple.apply({"one": "ONE!"})
        .apply(
            {
                "two": {
                    "user": g.inherit(),
                    "set": g.inherit().set(2),
                    "context": g.inherit().from_context("someValue"),
                },
            }
        )
        .with_policy(public),
        selfReferingType=identity_self_ref.apply(
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
