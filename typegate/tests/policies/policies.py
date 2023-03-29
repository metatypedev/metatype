from typegraph import TypeGraph, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import ModuleMat, PredefinedFunMat, PureFunMat


def make_policy(name, fn):
    return (
        t.func(
            t.struct({"a": t.integer()}),
            t.struct({"a": t.integer()}),
            PredefinedFunMat("identity"),
        )
        .named(name)
        .add_policy(PureFunMat(fn))
    )


with TypeGraph(
    "policies",
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    mod = ModuleMat("ts/policies.ts")

    secret_data = t.struct(
        {
            "username": t.string(),
            "data": t.string(),
        }
    ).named("SecretData")

    g.expose(
        pol_true=make_policy("true", "() => true"),
        pol_false=make_policy("false", "() => false"),
        pol_two=make_policy(
            "eq_two", "(_args, { context }) => Number(context.a) === 2"
        ),
        ns=t.struct(
            {
                "select": t.func(
                    t.struct(),
                    t.struct({"id": t.integer()}),
                    PureFunMat("() => ({ id: 12 })"),
                )
            }
        ),
    )
