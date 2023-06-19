# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomRuntime

# skip:end
with TypeGraph(
    "cors",
    # highlight-next-line
    cors=TypeGraph.Cors(
        # highlight-next-line
        allow_origin=["https://not-this.domain"],
        # highlight-next-line
        allow_headers=["x-custom-header"],
        # highlight-next-line
        expose_headers=["header-1"],
        # highlight-next-line
        allow_credentials=True,
        # highlight-next-line
        max_age_sec=60,
        # highlight-next-line
    ),
) as g:
    random = RandomRuntime(seed=0)
    public = policies.public()

    g.expose(
        catch_me_if_you_can=random.generate(t.string()),
        default_policy=[public],
    )
