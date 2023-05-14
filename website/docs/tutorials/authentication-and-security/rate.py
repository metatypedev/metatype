# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.random import RandomRuntime

# skip:end
with TypeGraph(
    "rate",
    # highlight-next-line
    rate=TypeGraph.Rate(
        # highlight-next-line
        window_limit=35,
        # highlight-next-line
        window_sec=15,
        # highlight-next-line
        query_limit=25,
        # highlight-next-line
        context_identifier=None,
        # highlight-next-line
        local_excess=0,
        # highlight-next-line
    ),
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    random = RandomRuntime()
    public = policies.public()

    g.expose(
        lightweight_call=random.generate(t.string(), rate_weight=1, rate_calls=True),
        medium_call=random.generate(t.string(), rate_weight=5, rate_calls=True),
        heavy_call=random.generate(t.string(), rate_weight=15, rate_calls=True),
        by_result_count=random.generate(
            t.array(t.string()),
            rate_weight=2,
            rate_calls=False,  # increment by # of results returned
        ),
        default_policy=[public],
    )
