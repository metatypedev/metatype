from typegraph import typegraph, t, Graph
from typegraph.runtimes.random import RandomRuntime
from typegraph.graph.params import Cors


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="roadmap-random",
    # skip:end
)
def roadmap(g: Graph):
    _bucket = t.struct(
        {
            "id": t.integer(as_id=True),
            "name": t.string(),
        }
    )
    idea = t.struct(
        {
            "id": t.uuid(
                as_id=True
            ),  # email is just a shorthand alias for `t.string({format: "uuid"})`
            "name": t.string(),
            "authorEmail": t.email(),  # another string shorthand
        }
    )
    _vote = t.struct(
        {
            "id": t.uuid(),
            "authorEmail": t.email(),
            "importance": t.enum(
                ["medium", "important", "critical"]
            ).optional(),  # `enum_` is also a shorthand over `t.string`
            "createdAt": t.datetime(),
            "desc": t.string().optional(),  # makes it optional
        }
    )
    random = RandomRuntime(reset=None)
    g.expose(get_idea=random.gen(idea))
