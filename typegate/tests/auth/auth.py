from typegraph import TypeGraph, policies, t
from typegraph.graph.auth.oauth2 import github_auth
from typegraph.policies import Policy
from typegraph.runtimes.deno import PredefinedFunMat, PureFunMat
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph("test_auth", auths=[github_auth]) as g:
    remote = HTTPRuntime("https://api.github.com")

    public = policies.public()
    private = Policy(
        PureFunMat("(_args, { context }) => !!context.user1"),
    )
    with_token = Policy(
        PureFunMat("(_args, { context }) => !!context.accessToken"),
    )

    x = t.struct({"x": t.integer()})

    g.expose(
        public=t.func(x, x, PredefinedFunMat("identity")).add_policy(public),
        private=t.func(x, x, PredefinedFunMat("identity")).add_policy(private),
        token=t.func(x, x, PredefinedFunMat("identity")).add_policy(with_token),
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
