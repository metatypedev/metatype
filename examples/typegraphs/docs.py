# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes import HttpRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def docs(g):
    sendinblue = HttpRuntime("https://api.sendinblue.com")

    public = Policy.public()

    newsletterSignUp = sendinblue.post(
        "v3/contacts",
        t.struct(
            {
                "email": t.email(),
                "listIds": t.list(t.integer()).set([8]),
                "header#api-key": t.string().from_secret("SENDINBLUE_KEY"),
            },
        ),
        t.struct({"id": t.integer().optional()}),
    ).with_policy(public)

    g.expose(
        newsletterSignUp=newsletterSignUp,
    )
