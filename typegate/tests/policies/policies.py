from typegraph_next import typegraph, t, Graph
from typegraph_next.graph.params import Auth
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph(
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})]
)
def policies(g: Graph):
    deno = DenoRuntime()

    _secret_data = t.struct(
        {
            "username": t.string(),
            "data": t.string(),
        },
        name="SecretData",
    )

    fn = deno.identity(
        t.struct({"a": t.integer()}),
    )

    g.expose(
        pol_true=fn.with_policy(deno.policy("true", "() => true")),
        pol_false=fn.with_policy(deno.policy("false", "() => false")),
        pol_two=fn.with_policy(
            deno.policy("eq_two", "(_args, { context }) => Number(context.a) === 2")
        ),
        ns=t.struct(
            {
                "select": deno.func(
                    t.struct({}),
                    t.struct({"id": t.integer()}),
                    code="() => ({ id: 12 })",
                )
            }
        ),
    )
