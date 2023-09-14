from typegraph_next import t, typegraph, Policy, Graph
from typegraph_next.runtimes.deno import DenoRuntime

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


@typegraph()
def test_apply_python(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()
    identity_simple = deno.func(
        simple_tpe, simple_tpe, code="({ one, two }) => { return { one, two } }"
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
    )
