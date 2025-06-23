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
    private = deno.policy(
        "private", "(_args, { context }) => !!context.user1 ? 'ALLOW' : 'DENY'"
    )
    with_token = deno.policy(
        "with_token",
        "(_args, { context }) => { return !!context.profile.id ? 'ALLOW' : 'DENY'; }",
    )

    x = t.struct({"x": t.integer()})

    # deno runtime
    # g.auth(Auth.oauth2_github("openid profile email"))

    # python runtime
    g.auth(
        Auth.oauth2(
            provider="github",
            clients=[
                {
                    "id_secret": "TEST_CLIENT_ID",
                    "redirect_uri_secret": "TEST_REDIRECT_URI",
                }
            ],
            profiler=python.from_lambda(
                t.struct({"id": t.integer()}),
                t.struct({"id": t.integer()}),
                lambda p: {"id": p["id"]},
            ),
            scopes=["openid", "profile", "email"],
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
        # context_raw=deno.fetch_context().with_policy(public) # no args if shape is unknown
        context=deno.fetch_context(
            t.struct(
                {
                    "provider": t.string(),
                    "accessToken": t.string(),
                    "refreshAt": t.integer(),
                    "profile": t.struct(
                        {
                            "id": t.integer(),
                        }
                    ),
                    "exp": t.integer(),
                    "iat": t.integer(),
                }
            )
        ).with_policy(public),
    )
