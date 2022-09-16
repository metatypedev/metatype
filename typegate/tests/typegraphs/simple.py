from typegraph import policies
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import PredefinedFunMat
from typegraph.types import typedefs as t

with TypeGraph("testing") as g:

    rec = t.func(
        t.struct({"nested": t.struct({"arg": t.integer()}).named("Nested")}),
        t.integer(),
        FunMat.from_lambda(lambda args: args["nested"]["arg"]),
    )

    g.expose(
        rec=rec.add_policy(policies.allow_all()),
        test=t.func(
            t.struct({"a": t.integer().named("arg1")}).named("inp"),
            t.struct({"a": t.integer().named("deps")}).named("res"),
            PredefinedFunMat("identity"),
        )
        .named("f")
        .add_policy(policies.allow_all()),
    )
