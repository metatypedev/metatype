from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.auth.oauth2 import github_auth
from typegraph.policies import Policy
from typegraph.runtimes.deno import FunMat
from typegraph.runtimes.deno import IdentityMat
from typegraph.runtimes.http import HTTPRuntime


with TypeGraph("test_auth", auths=[github_auth]) as g:
    remote = HTTPRuntime("https://api.github.com")

    public = policies.public()
    private = Policy(
        FunMat("(_args, { context }) => !!context.user1"),
    )
    with_token = Policy(
        FunMat("(_args, { context }) => !!context.accessToken"),
    )

    x = t.struct({"x": t.integer()})

    g.expose(
        public=t.func(x, x, IdentityMat()).add_policy(public),
        private=t.func(x, x, IdentityMat()).add_policy(private),
        token=t.func(x, x, IdentityMat()).add_policy(with_token),
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
        ).add_policy(public),
    )
