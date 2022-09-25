from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import IdentityMat
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import typedefs as t


with TypeGraph("auth", auths=[github_auth]) as g:
    remote = HTTPRuntime("https://api.github.com")

    all = allow_all()

    x = t.struct({"x": t.integer()})

    g.expose(
        all=t.func(x, x, IdentityMat()).add_policy(all),
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
        ).add_policy(all),
    )
