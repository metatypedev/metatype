# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Auth
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.http import HttpRuntime
from typegraph.runtimes.python import PythonRuntime


@typegraph(
    name="test_auth",
)
def auth(g: Graph):
    deno = DenoRuntime()
    python = PythonRuntime()
    remote = HttpRuntime("https://api.github.com")

    public = Policy.public()
    private = deno.policy("private", "(_args, { context }) => !!context.user1")
    with_token = deno.policy(
        "with_token", "(_args, { context }) => { return !!context.accessToken; }"
    )

    x = t.struct({"x": t.integer()})

    # deno runtime
    # g.auth(Auth.oauth2_github("openid profile email"))

    # python runtime
    g.auth(
        Auth.oauth2(
            name="github",
            authorize_url="https://github.com/login/oauth/authorize",
            access_url="https://github.com/login/oauth/access_token",
            # https://docs.github.com/en/rest/reference/users?apiVersion=2022-11-28#get-the-authenticated-user
            profile_url="https://api.github.com/user",
            # profiler="(p) => ({id: p.id})",
            profiler=python.from_lambda(
                t.struct({"id": t.integer()}),
                t.struct({"id": t.integer()}),
                lambda p: {"id": p["id"]},
            ),
            scopes="openid profile email",
        )
    )

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
