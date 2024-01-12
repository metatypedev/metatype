# skip:start
from os import environ

from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import DenoRuntime, GraphQLRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def team_a(g: Graph):
    public = Policy.public()

    deno = DenoRuntime()
    records = GraphQLRuntime(environ.get("TG_URL", "http://localhost:7890") + "/team-b")

    g.expose(
        public,
        version_team_b=records.query(t.struct({}), t.integer(), path=["version"]),
        version_team_a=deno.static(t.integer(), 3),
    )


# @typegraph(
#     # skip:next-line
#     cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
# )
# def team_b(g: Graph):
#     public = Policy.public()
#
#     deno = DenoRuntime()
#
#     g.expose(
#         public,
#         version=deno.static(t.integer(), 12),
#         record=deno.static(t.struct({"weight": t.integer()}), {"weight": 100}),
#     )
