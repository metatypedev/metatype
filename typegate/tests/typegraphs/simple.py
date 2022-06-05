from typegraph import policies
from typegraph.cli import dev
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers import deno
from typegraph.types import typedefs as t

with TypeGraph("testing") as g:

    g.expose(
        test=t.func(
            t.struct({"a": t.integer().named("arg1")}).named("inp"),
            t.struct({"a": t.integer().named("deps")}).named("res"),
            deno.FunMat("identity"),
        )
        .named("f")
        .add_policy(policies.allow_all())
    )
print(dev.serialize_typegraph(g))
