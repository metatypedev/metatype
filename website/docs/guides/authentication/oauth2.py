# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime

# skip:end

with TypeGraph(
    "oauth2_authentication",
    auths=[
        # highlight-start
        TypeGraph.Auth.oauth2(
            "github",
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            "openid profile email",
        ),
        # highlight-end
    ],
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    deno = DenoRuntime()
    public = policies.public()

    ctx = t.struct({"exp": t.integer().optional().from_context("exp")})

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
