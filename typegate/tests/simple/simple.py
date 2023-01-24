from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.deno import PredefinedFunMat
from typegraph.runtimes.deno import PureFunMat

with TypeGraph("testing") as g:

    rec = t.func(
        t.struct({"nested": t.struct({"arg": t.integer()}).named("Nested")}),
        t.integer(),
        PureFunMat("(args) => args.nested && args.nested.arg"),
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
