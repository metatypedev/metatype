# skip:start
from os import environ
from urllib.parse import quote_plus

from typegraph import TypeGraph, policies, t
from typegraph.graph.auth import oauth2
from typegraph.runtimes.deno import DenoRuntime, PureFunMat

# skip:end
with TypeGraph(
    "iam-provider",
    auths=[oauth2.github("openid profile email")],
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    public = policies.public()

    deno = DenoRuntime()
    host = environ.get("TG_URL", "http://localhost:7890")
    url = f"{host}/iam-provider/auth/github?redirect_uri={quote_plus(host)}"

    g.expose(
        loginUrl=deno.static(t.string(), url),
        logoutUrl=deno.static(t.string(), f"{url}&clear"),
        context=t.func(
            t.struct({}),
            t.struct({"username": t.string()}).optional(),
            PureFunMat(
                "(_, { context }) => Object.keys(context).length === 0 ? null : context"
            ),
        ),
        default_policy=[public],
    )
