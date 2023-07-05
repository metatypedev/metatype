import os

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import ModuleMat

with TypeGraph("deno-reload") as g:
    public = policies.public()
    mod = ModuleMat(os.environ["DYNAMIC"])

    g.expose(
        fire=t.func(
            t.struct({}),
            t.number(),
            mod.imp("fire"),
        ).add_policy(public),
    )
