# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph

# skip:start
from typegraph.graph.params import Cors
from typegraph.runtimes.random import RandomRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    name="roadmap-random",
    # skip:end
)
def roadmap(g: Graph):
    # skip:start
    _bucket = t.struct(
        {
            "id": t.integer(as_id=True),
            "name": t.string(),
        },
    )
    _vote = t.struct(
        {
            "id": t.uuid(),
            "authorEmail": t.email(),
            "importance": t.enum(
                ["medium", "important", "critical"],
            ).optional(),  # `enum_` is also a shorthand over `t.string`
            "createdAt": t.datetime(),
            "desc": t.string().optional(),  # makes it optional
        },
    )
    # skip:end
    idea = t.struct(
        {
            "id": t.uuid(
                as_id=True,
            ),  # uuid is just a shorthand alias for `t.string({format: "uuid"})`
            "name": t.string(),
            "authorEmail": t.email(),  # another string shorthand
        },
    )
    random = RandomRuntime(reset=None, seed=1)
    pub = Policy.public()
    g.expose(pub, get_idea=random.gen(idea))
