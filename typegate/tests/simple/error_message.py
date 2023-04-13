from typegraph import TypeGraph, effects, policies, t
from typegraph.runtimes.deno import PredefinedFunMat

with TypeGraph("test_error") as g:
    user = t.struct({"id": t.integer(), "name": t.string()})
    g.expose(
        returnSelf=t.func(
            user.named("InputA"),
            user.named("OutputA"),
            PredefinedFunMat("identity", effect=effects.none()),
        ).add_policy(policies.public()),
        returnSelfQuery=t.func(
            user.named("InputB"),
            user.named("OutputB"),
            PredefinedFunMat("identity", effect=effects.none()),
        ).add_policy(policies.public()),
        returnSelfMutation=t.func(
            user.named("InputC"),
            user.named("OutputC"),
            PredefinedFunMat("identity", effect=effects.create()),
        ).add_policy(policies.public()),
    )
