# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, t, typegraph
from typegraph.graph.params import Cors


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def types(g: Graph):
    # skip:end
    t.struct(
        {
            "id": t.uuid(),
            "age": t.integer(),
            "cars": t.list(
                t.struct(
                    {
                        "model": t.string(),
                        "name": t.string().optional(),
                    },
                ),
            ),
        },
    )
