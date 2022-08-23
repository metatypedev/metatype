from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.materializers import worker
from typegraph.types import typedefs as t

with TypeGraph("testing") as g:

    rec = t.func(
        t.struct({"nested": t.struct({"arg": t.integer()})}),
        t.integer(),
        worker.JavascriptMat(
            g.fun(worker.JavascriptMat.lift(lambda args: args["nested"]["arg"])),
        ),
    )

    g.expose(
        rec=rec.add_policy(policies.allow_all()),
        test=t.func(
            t.struct({"a": t.integer().named("arg1")}).named("inp"),
            t.struct({"a": t.integer().named("deps")}).named("res"),
            deno.FunMat("identity"),
        )
        .named("f")
        .add_policy(policies.allow_all()),
    )
