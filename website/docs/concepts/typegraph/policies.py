# skip:start
from typegraph import typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def policies(g):
    # skip:end
    deno = DenoRuntime()
    public = deno.policy("public", "() => true")  # noqa
    team_only = deno.policy("team", "(ctx) => ctx.user.role === 'admin'")  # noqa
