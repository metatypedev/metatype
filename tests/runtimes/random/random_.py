# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.random import RandomRuntime

rec = t.struct(
    {
        "uuid": t.uuid(),
        "int": t.integer(),
        "str": t.string(),
        "email": t.email(),
    }
)

users = t.struct(
    {
        "id": t.uuid(),
        "name": t.string(config={"gen": "name"}),
        "age": t.integer(config={"gen": "age", "type": "adult"}),
        "address": t.struct(
            {
                "street": t.string(config={"gen": "address"}),
                "city": t.string(config={"gen": "city"}),
                "postcode": t.string(config={"gen": "postcode"}),
                "country": t.string(config={"gen": "country", "full": True}),
            }
        ),
    }
)

list = t.struct(
    {
        "array_of_array_of_names": t.list(t.list(t.string(config={"gen": "name"}))),
    }
)


@typegraph()
def random_(g: Graph):
    runtime_1 = RandomRuntime(seed=1)
    runtime_2 = RandomRuntime(seed=1)

    pub = Policy.public()

    g.expose(
        randomRec=runtime_1.gen(rec).with_policy(pub),
        randomUser=runtime_1.gen(users).with_policy(pub),
        randomList=runtime_2.gen(list).with_policy(pub),
    )
