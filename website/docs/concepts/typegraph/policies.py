# skip:start
from typegraph.policies import Policy
from typegraph.runtimes.deno import PureFunMat

# skip:end
public = Policy(PureFunMat("() => true"))
team_only = Policy(PureFunMat("(ctx) => ctx.user.role === 'admin'"))
