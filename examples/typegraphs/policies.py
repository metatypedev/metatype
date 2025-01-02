# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Auth
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.random import RandomRuntime


@typegraph(
    cors=Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
    ),
)
def policies(g: Graph):
    # skip:end
    deno = DenoRuntime()
    random = RandomRuntime(seed=0, reset=None)

    # `public` is sugar for to `(_args, _ctx) => "PASS"`
    public = Policy.public()

    admin_only = deno.policy(
        "admin_only",
        # note: policies either return "ALLOW" | "DENY" | "PASS"
        "(args, { context }) => context?.username === 'admin' ? 'ALLOW' : 'DENY'",
    )
    user_only = deno.policy(
        "user_only",
        "(args, { context }) => context?.username === 'user' ? 'PASS' : 'DENY'",
    )

    g.auth(Auth.basic(["admin", "user"]))

    g.expose(
        # set default policy for the exposed functions
        Policy.public(),
        public=random.gen(t.string()).with_policy(public),
        admin_only=random.gen(t.string()).with_policy(admin_only),
        user_only=random.gen(t.string()).with_policy(user_only),
        # if both policies return null, access is denied
        both=random.gen(t.string()).with_policy(user_only, admin_only),
    )
