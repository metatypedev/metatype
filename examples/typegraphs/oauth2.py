# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth, Cors
from typegraph.runtimes.deno import DenoRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def oauth2_authentication(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    ctx = t.struct({"exp": t.integer().optional()})

    # highlight-start
    g.auth(
        Auth.oauth2(
            provider="github",
            scopes=["openid", "profile", "email"],
            clients=[
                {
                    "id_secret": "APP_CLIENT_ID",
                    "redirect_uri_secret": "APP_REDIRECT_URI",
                }
            ],
        )
    )
    # highlight-end

    g.expose(
        public,
        get_context=deno.identity(ctx).apply(
            {
                "exp": g.from_context("exp"),
            }
        ),
    )
