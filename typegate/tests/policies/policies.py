from typegraph import TypeGraph, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import ModuleMat, PredefinedFunMat, PureFunMat


def make_policy(g, name, fn):
    return t.func(
        t.struct({"a": t.integer()}),
        t.struct({"a": t.integer()}),
        PredefinedFunMat("identity"),
    ).add_policy(PureFunMat(fn))


with TypeGraph(
    "policies",
    auths=[Auth.jwk("native", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    mod = ModuleMat("ts/policies.ts")

    secret_data = t.struct(
        {
            "username": t.string(),
            "data": t.string(),
        }
    ).named("SecretData")

    g.expose(
        pol_true=make_policy(g, "true", "() => true"),
        pol_false=make_policy(g, "false", "() => false"),
        pol_two=make_policy(
            g, "eq_two", "(_args, { context }) => Number(context.a) === 2"
        ),
        secret=t.func(
            t.struct({"username": t.string()}),
            secret_data,
            mod.imp("readSecret"),
        ).add_policy(mod.imp("isAllowedToReadSecret")),
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
