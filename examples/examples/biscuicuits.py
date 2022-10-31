from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import Rate
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import ModuleMat
from typegraph.materializers.http import HTTPRuntime
from typegraph.policies import allow_all
from typegraph.types import types as t


def send_in_blue_send(subject, frm, to, api_key):
    f = ModuleMat("send_in_blue_send.ts")

    return t.func(
        t.struct(
            {
                "name": t.string(),
                "email": t.email(),
                "subject": t.string().set(subject),
                "message": t.string(),
                "apiKey": t.string().from_secret(api_key),
                "from": t.string().from_secret(frm),
                "to": t.string().from_secret(to),
            }
        ),
        t.struct({"success": t.boolean(), "error": t.string().optional()}),
        f.imp("default"),
    ).rate(weight=2)


with TypeGraph(
    "biscuicuits",
    auths=[github_auth],
    rate=Rate(window_limit=2000, window_sec=60, query_limit=200),
) as g:

    all = allow_all()
    remote = HTTPRuntime("https://api.github.com")

    g.query(
        contact=send_in_blue_send(
            "Nouveau message",
            "SENDER",
            "TO",
            "SENDINBLUE_API_KEY",
        ).add_policy(all),
        user=remote.get(
            "/user",
            t.struct({"token": t.string().from_context("accessToken")}),
            t.struct(
                {
                    "id": t.integer(),
                    "login": t.string(),
                }
            ).optional(),
            auth_token_field="token",
        ).add_policy(all),
    )
