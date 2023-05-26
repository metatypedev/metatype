from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("post_content_length") as g:
    public = policies.public()

    inp = t.struct({"message": t.string()})
    g.expose(
        identity=t.func(
            inp.named("Input"), inp.named("Output"), PredefinedFunMat("identity")
        ).add_policy(public),
    )
