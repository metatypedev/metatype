from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.deno import ModuleMat
from typegraph.runtimes.deno import PredefinedFunMat


def make_policy(g, name, fn):
    return t.func(
        t.struct({"a": t.integer()}),
        t.struct({"a": t.integer()}),
        PredefinedFunMat("identity"),
    ).add_policy(FunMat(fn))


with TypeGraph("policies", auths=[Auth.jwk("native")]) as g:

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
            t.struct({"username": t.string()}), secret_data, mod.imp("readSecret")
        ).add_policy(mod.imp("isAllowedToReadSecret")),
    )
