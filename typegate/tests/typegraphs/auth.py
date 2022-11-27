from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import IdentityMat
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.policies import Policy
from typegraph.types import types as t


with TypeGraph("test_auth", auths=[github_auth]) as g:
    remote = HTTPRuntime("https://api.github.com")

    public = allow_all()
    private = Policy(
        FunMat("(args) => !!args.user1"),
    )
    with_token = Policy(
        FunMat("(args) => !!args.accessToken"),
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
