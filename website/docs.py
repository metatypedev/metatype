from typegraph.graphs.typegraph import Cors
from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.http import HTTPRuntime
from typegraph.materializers.random import RandomMat
from typegraph.policies import Policy
from typegraph.types import types as t

with TypeGraph(
    "docs",
    cors=Cors(allow_origin=["http://localhost:3000", "https://cloud.metatype.dev"]),
) as g:

    sendinblue = HTTPRuntime("https://api.sendinblue.com")

    public = Policy(FunMat("() => true")).named("allow_all_policy")

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
