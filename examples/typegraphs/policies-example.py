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
    public = deno.policy("public", "() => true")  # noqa
    team_only = deno.policy("team", "(ctx) => ctx.user.role === 'admin'")  # noqa
