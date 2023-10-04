# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Auth
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    auths=[
        # highlight-start
        # expects a secret in metatype.yml
        # `TG_[typegraph]_BASIC_[username]`
        # highlight-next-line
        Auth.basic(["admin"]),
        # highlight-end
    ],
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"username": t.string().optional().from_context("username")})

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
