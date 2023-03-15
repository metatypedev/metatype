# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomRuntime

# skip:end
with TypeGraph(
    "cors",
    # hightlight-start
    cors=TypeGraph.Cors(
        allow_origin=["https://not-this.domain"],
        allow_headers=["authorization"],
        expose_headers=["header-1"],
        allow_credentials=True,
        max_age_sec=60,  # cache in seconds
    ),
    # hightlight-end
) as g:
    random = RandomRuntime()
    public = policies.public()

    g.expose(
        catch_me_if_you_can=random.generate(t.string()),
        default_policy=[public],
    )
