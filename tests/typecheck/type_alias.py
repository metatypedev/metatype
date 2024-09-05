from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.random import RandomRuntime


@typegraph()
def type_alias(g: Graph):
    random = RandomRuntime(seed=1)
    public = Policy.public()

    infos = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
        }
    )

    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
            "info": t.list(infos),
        }
    )

    g.expose(
        public,
        get_message=random.gen(message),
    )
