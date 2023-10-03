# skip:start
from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Cors, Rate
from typegraph_next.runtimes.random import RandomRuntime


# skip:end
@typegraph(
    # highlight-next-line
    rate=Rate(
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
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def rate(g: Graph):
    random = RandomRuntime(seed=0)
    public = Policy.public()

    g.expose(
        public,
        lightweight_call=random.gen(t.string()).rate(calls=True, weight=1),
        medium_call=random.gen(t.string()).rate(calls=True, weight=5),
        heavy_call=random.gen(t.string()).rate(calls=True, weight=15),
        by_result_count=random.gen(
            t.array(t.string()),
        ).rate(
            calls=False, weight=2
        ),  # increment by # of results returned
    )
