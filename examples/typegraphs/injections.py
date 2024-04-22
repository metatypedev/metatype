from typegraph import Policy, typegraph, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def injection_example(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.expose(
        get_injected=deno.func(
            t.struct(
                {
                    "static_value": t.integer().set(12),
                    "context_value": t.uuid().from_context("profile.userId"),
                    "secret_value": t.string().from_secret("secret_name"),
                    "dynamic_value": t.datetime().inject("now"),
                }
            ),
            t.struct(
                {
                    "static_value": t.integer().rename("Static"),
                    "context_value": t.uuid(),
                    "secret_value": t.string(),
                    "nested": deno.identity(
                        t.struct({"parent_value": t.integer().from_parent("Static")}),
                    ),
                    "dynamic_value": t.datetime(),
                }
            ),
            code="""
            ({ static_value, context_value, secret_value, dynamic_value } ) => ({ static_value, context_value, secret_value, dynamic_value })
            """,
        ).with_policy(pub)
    )
