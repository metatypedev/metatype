from typegraph import Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes import HttpRuntime


@typegraph(
    cors=Cors(allow_origin=["http://localhost:3000", "https://cloud.metatype.dev"]),
)
def docs(g):
    sendinblue = HttpRuntime("https://api.sendinblue.com")

    public = Policy.public()

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
