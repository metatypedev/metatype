# skip:start
from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth, Cors
from typegraph_next.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    auths=[
        # highlight-next-line
        Auth.basic(["admin"]),
    ],
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def basic_authentification(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"username": t.string().optional().from_context("username")})

    g.expose(
        public,
        get_context=deno.identity(ctx),
    )
