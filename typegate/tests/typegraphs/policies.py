from typegraph.graphs.typegraph import Auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import PredefinedFunMat
from typegraph.policies import Policy
from typegraph.types import types as t


def make_policy(g, name, fn):
    pol = Policy(
        FunMat(fn),
    )
    return t.func(
        t.struct({"a": t.integer()}),
        t.struct({"a": t.integer()}),
        PredefinedFunMat("identity"),
    ).add_policy(pol)


with TypeGraph("policies", auths=[Auth.jwk("native")]) as g:

    g.expose(
        pol_true=make_policy(g, "true", "() => true"),
        pol_false=make_policy(g, "false", "() => false"),
        pol_two=make_policy(g, "eq_two", "(args) => Number(args.a) === 2"),
    )
