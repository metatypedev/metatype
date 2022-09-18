from typegraph.graphs.typegraph import github_auth
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import ModuleMat
from typegraph.policies import allow_all
from typegraph.types import typedefs as t


def send_in_blue_send(subject, frm, to, api_key):
    f = ModuleMat("send_in_blue_send.ts")

    return t.func(
        t.struct(
            {
                "name": t.string(),
                "email": t.email(),
                "subject": t.string().s_raw(subject),
                "message": t.string(),
                "apiKey": t.string().s_secret(api_key),
                "from": t.string().s_secret(frm),
                "to": t.string().s_secret(to),
            }
        ),
        t.struct({"success": t.boolean(), "error": t.string().s_optional()}),
        f.imp("default"),
    ).limit()


with TypeGraph(
    "biscuicuits",
    auths=[github_auth],
    rate_limit=2000,
    rate_window_sec=60,
    rate_limit_query=200,
) as g:

    g.add_auth(github_auth)

    all = allow_all()

    g.expose(
        contact=send_in_blue_send(
            "Nouveau message",
            "SENDER",
            "TO",
            "SENDINBLUE_API_KEY",
        ).add_policy(all)
    )
