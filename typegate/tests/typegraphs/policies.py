from typegraph.graphs.typegraph import Auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import PredefinedFunMat
from typegraph.types import typedefs as t


def make_policy(g, name, fn):
    pol = t.policy(
        t.struct(),
        FunMat.from_lambda(fn),
    )
    return t.func(
        t.struct({"a": t.integer()}),
        t.struct({"a": t.integer()}),
        PredefinedFunMat("identity"),
    ).add_policy(pol)


with TypeGraph("policies", auths=[Auth.jwk("native")]) as g:

    g.expose(
        pol_true=make_policy(g, "true", lambda args: True),
        pol_false=make_policy(g, "false", lambda args: False),
        pol_two=make_policy(g, "eq_two", lambda args: int(args["a"]) == 2),
    )
