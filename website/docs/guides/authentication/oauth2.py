# skip:start
from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth, Cors
from typegraph_next.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    auths=[
        # highlight-start
        Auth.oauth2(
            "github",
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            "openid profile email",
        ),
        # highlight-end
    ],
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def oauth2_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"exp": t.integer().optional().from_context("exp")})

    g.expose(
        public,
        get_context=deno.identity(ctx),
    )
