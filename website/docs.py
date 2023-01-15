from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.runtimes.http import HTTPRuntime
from typegraph.runtimes.random import RandomMat

with TypeGraph(
    "docs",
    cors=TypeGraph.Cors(
        allow_origin=["http://localhost:3000", "https://cloud.metatype.dev"]
    ),
) as g:

    sendinblue = HTTPRuntime("https://api.sendinblue.com")

    public = policies.allow_all()

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
        get=t.gen(t.string(), RandomMat()).add_policy(
            public
        ),  # https://metatype.atlassian.net/browse/MET-11
    )
