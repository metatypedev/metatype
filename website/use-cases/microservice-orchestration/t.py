# skip:start
from os import environ

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.graphql import GraphQLRuntime

# skip:end
with TypeGraph(
    "team-a",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g1:
    public = policies.public()

    deno = DenoRuntime()
    records = GraphQLRuntime(environ.get("TG_URL", "http://localhost:7890") + "/team-b")

    g1.expose(
        version_team_b=records.query(t.struct({}), t.integer(), path=("version",)),
        version_team_a=deno.static(t.integer(), 3),
        default_policy=[public],
    )

with TypeGraph(
    "team-b",
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g2:
    public = policies.public()

    deno = DenoRuntime()

    g2.expose(
        version=deno.static(t.integer(), 12),
        record=deno.static(t.struct({"weight": t.integer()}), {"weight": 100}),
        default_policy=[public],
    )
