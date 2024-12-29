# skip:start
from typegraph import typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def policies_example(g):
    # skip:end
    deno = DenoRuntime()
    public = deno.policy("public", "() => 'PASS'")  # noqa
    allow_all = deno.policy("allow_all", "() => 'ALLOW'")  # noqa
    team_only = deno.policy(  # noqa
        "team", "(ctx) => ctx.user.role === 'admin' ? 'ALLOW' : 'DENY' "
    )
