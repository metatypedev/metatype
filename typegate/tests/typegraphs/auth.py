from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import IdentityMat
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import typedefs as t


with TypeGraph("test_auth", auths=[github_auth]) as g:
    remote = HTTPRuntime("https://api.github.com")

    public = allow_all()
    private = t.policy(
        t.struct(),
        FunMat.from_lambda(lambda ctx: not not ctx.user1),
    )
    withToken = t.policy(
        t.struct(),
        FunMat.from_lambda(lambda ctx: not not ctx.accessToken),
    )

    x = t.struct({"x": t.integer()})

    g.expose(
        public=t.func(x, x, IdentityMat()).add_policy(public),
        private=t.func(x, x, IdentityMat()).add_policy(private),
        token=t.func(x, x, IdentityMat()).add_policy(withToken),
        user=remote.get(
            "/user",
            t.struct({"token": t.string().s_context("token")}),
            t.struct(
                {
                    "id": t.integer(),
                    "login": t.string(),
                }
            ),
            auth_token_field="token",
        ).add_policy(public),
    )
