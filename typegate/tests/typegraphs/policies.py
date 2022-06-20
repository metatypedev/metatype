from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.materializers import worker
from typegraph.types import typedefs as t


def make_policy(name, fn):
    pol = t.policy(
        t.struct(),
        worker.JavascriptMat(
            worker.JavascriptMat.lift(fn),
            name,
        ),
    )
    return t.func(
        t.struct({"a": t.integer()}),
        t.struct({"a": t.integer()}),
        deno.FunMat("identity"),
    ).add_policy(pol)


with TypeGraph("policies") as g:

    g.expose(
        pol_true=make_policy("true", lambda args: True),
        pol_false=make_policy("false", lambda args: False),
        pol_two=make_policy("eq_two", lambda args: int(args["a"]) == 2),
    )
