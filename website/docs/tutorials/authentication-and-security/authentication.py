# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.graph.models import Auth
from typegraph.runtimes.random import RandomRuntime

# skip:end

with TypeGraph(
    "auth",
    # highlight-next-line
    auths=[
        # highlight-next-line
        # expects 2 secrets in uppercase snake case:
        # highlight-next-line
        # `TG_[typegraph name]_[auth name]_CLIENT_ID`
        # highlight-next-line
        # `TG_[typegraph name]_[auth name]_CLIENT_SECRET`
        # highlight-next-line
        Auth.oauth2(
            # highlight-next-line
            "github",  # auth name
            # highlight-next-line
            "https://github.com/login/oauth/authorize",
            # highlight-next-line
            "https://github.com/login/oauth/access_token",
            # highlight-next-line
            "openid profile email",
            # highlight-next-line
            "https://api.github.com/user",
            # highlight-next-line
        ),
        # highlight-next-line
        # expects a secret `TG_[typegraph name]_BASIC_[user name]`
        # highlight-next-line
        TypeGraph.Auth.basic(["admin"]),
        # highlight-next-line
        # expects a secret `TG_[typegraph name]_[auth name]_JWT`
        # highlight-next-line
        Auth.jwt(
            # highlight-next-line
            "keycloak",
            # highlight-next-line
            "jwk",
            # highlight-next-line
            {"name": "ECDSA", "namedCurve": "P-384", "role": "superuser"}
            # highlight-next-line
        ),
        # highlight-next-line
        # Shortcut for jwt with HMAC SHA-256 and raw format
        # highlight-next-line
        Auth.hmac256("custom"),
        # highlight-next-line
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
            "jwt": t.string().optional().from_context("role_field"),
            "github": t.string().optional().from_context("username"),
        }
    )

    g.expose(
        get_context=random.generate(context),
        default_policy=[public],
    )
