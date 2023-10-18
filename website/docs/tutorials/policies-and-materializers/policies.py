# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Auth
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.random import RandomRuntime

# skip:end


@typegraph(
    cors=Cors(
        allow_origin=["https://metatype.dev", "http://localhost:3000"],
    ),
)
def policies(g: Graph):
    deno = DenoRuntime()
    random = RandomRuntime(seed=0)
    public = Policy.public()

    admin_only = deno.policy(
        "admin_only",
        "(args, { context }) => context.username ? context.username === 'admin' : null",
    )
    user_only = deno.policy(
        "user_only",
        "(args, { context }) => context.username ? context.username === 'user' : null",
    )

    g.auth(Auth.basic(["admin", "user"]))

    g.expose(
        public=random.gen(t.string()).with_policy(public),
        admin_only=random.gen(t.string()).with_policy(admin_only),
        user_only=random.gen(t.string()).with_policy(user_only),
        both=random.gen(t.string()).with_policy(user_only, admin_only),
    )
