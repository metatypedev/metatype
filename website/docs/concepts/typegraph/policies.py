# skip:start
from typegraph import typegraph, Policy
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def policies(g):
    # skip:end
    deno = DenoRuntime()
    public = deno.policy("public", "() => true")
    team_only = deno.policy("team", "(ctx) => ctx.user.role === 'admin'")
