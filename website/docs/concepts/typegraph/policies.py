# skip:start
from typegraph import TypeGraph
from typegraph.policies import Policy
from typegraph.runtimes.deno import PureFunMat

with TypeGraph("policies") as g:
    # skip:end
    public = Policy(PureFunMat("() => true"))
    team_only = Policy(PureFunMat("(ctx) => ctx.user.role === 'admin'"))
