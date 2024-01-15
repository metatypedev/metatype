# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth, Cors
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def jwt_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct(
        {"your_own_content": t.string().optional().from_context("your_own_content")}
    )
    # highlight-next-line
    g.auth(Auth.hmac256("custom"))

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
