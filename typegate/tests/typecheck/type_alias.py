from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes.random import RandomRuntime


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
            "info": t.array(infos),
        }
    )

    g.expose(
        public,
        get_message=random.gen(message),
    )
