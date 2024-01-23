# skip:start
from os import environ
from urllib.parse import quote_plus

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors, Auth
from typegraph.runtimes import DenoRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def iam_provider(g: Graph):
    g.auth(Auth.oauth2_github("openid profile email"))

    public = Policy.public()

    deno = DenoRuntime()
    host = environ.get("TG_URL", "http://localhost:7890")
    url = f"{host}/iam-provider/auth/github?redirect_uri={quote_plus(host)}"

    g.expose(
        public,
        loginUrl=deno.static(t.string(), url),
        logoutUrl=deno.static(t.string(), f"{url}&clear"),
        context=deno.func(
            t.struct({}),
            t.struct({"username": t.string()}).optional(),
            code="(_, { context }) => Object.keys(context).length === 0 ? null : context",
        ),
    )
