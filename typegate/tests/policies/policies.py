from typegraph import typegraph, t, Graph, Policy
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
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

    g.auth(Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}}))

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


@typegraph()
def multiple_public_policies(g: Graph):
    deno = DenoRuntime()

    record = t.struct(
        {
            "id": t.integer(),
        },
        name="Record",
    )

    g.expose(
        record1=deno.static(record, {"id": 1}).with_policy(
            Policy.public(),
        ),
        record2=deno.static(record, {"id": 2}).with_policy(
            Policy.public(),
        ),
    )
