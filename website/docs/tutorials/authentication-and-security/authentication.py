# skip:start
from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.models import Auth
from typegraph.runtimes.random import RandomRuntime

# skip:end

with TypeGraph(
    "auth",
    # hightlight-start
    auths=[
        # expects a secret `TG_[typegraph name]_[auth name]_CLIENT_ID`
        # and `TG_[typegraph name]_[auth name]_CLIENT_SECRET`
        Auth.oauth2(
            "github",  # auth name
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            "openid profile email",
            "https://api.github.com/user",
        ),
        # expects a secret `TG_[typegraph name]_BASIC_[user name]`
        TypeGraph.Auth.basic(["admin"]),
        # expects a secret `TG_[typegraph name]_[auth name]_JWK`
        Auth.jwk("native", "role_field"),
    ],
    # hightlight-end
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    random = RandomRuntime()
    public = policies.public()

    context = t.struct(
        {
            "basic": t.string().optional().from_context("user"),
            "jwk": t.string().optional().from_context("role_field"),
            "github": t.string().optional().from_context("username"),
        }
    )

    g.expose(
        get_context=random.generate(context),
        default_policy=[public],
    )
