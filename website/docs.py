from typegraph import TypeGraph, policies, t
from typegraph.runtimes.http import HTTPRuntime

with TypeGraph(
    "docs",
    cors=TypeGraph.Cors(
        allow_origin=["http://localhost:3000", "https://cloud.metatype.dev"]
    ),
) as g:
    sendinblue = HTTPRuntime("https://api.sendinblue.com")

    public = policies.public()

    newsletterSignUp = sendinblue.post(
        "v3/contacts",
        t.struct(
            {
                "email": t.email(),
                "listIds": t.array(t.integer()).set([8]),
                "header#api-key": t.string().from_secret("SENDINBLUE_KEY"),
            }
        ),
        t.struct({"id": t.integer().optional()}),
    ).add_policy(public)

    g.expose(
        newsletterSignUp=newsletterSignUp,
    )
