# skip:start
from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth, Cors
from typegraph_next.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    auths=[
        # highlight-next-line
        Auth.hmac256("custom"),
    ],
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def jwt_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct(
        {"your_own_content": t.string().optional().from_context("your_own_content")}
    )

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
