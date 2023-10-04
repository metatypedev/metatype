from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import oauth2
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.http import HttpRuntime


@typegraph(
    name="test_auth",
    auths=[oauth2.github("openid profile email")],
)
def test_auth(g: Graph):
    deno = DenoRuntime()
    remote = HttpRuntime("https://api.github.com")

    public = Policy.public()
    private = deno.policy("private", "(_args, { context }) => !!context.user1")
    with_token = deno.policy(
        "with_token", "(_args, { context }) => !!context.accessToken"
    )

    x = t.struct({"x": t.integer()})

    g.expose(
        public=deno.identity(x).with_policy(public),
        private=deno.identity(x).with_policy(private),
        token=deno.identity(x).with_policy(with_token),
        user=remote.get(
            "/user",
            t.struct({"token": t.string().from_context("token")}),
            t.struct(
                {
                    "id": t.integer(),
                    "login": t.string(),
                }
            ),
            auth_token_field="token",
        ).with_policy(public),
    )
