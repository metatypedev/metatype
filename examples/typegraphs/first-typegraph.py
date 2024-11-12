# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes import RandomRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def first_typegraph(g: Graph):
    # declare runtimes and policies
    random = RandomRuntime(reset=None)
    public = Policy.public()

    # declare types
    message = t.struct(
        {
            "id": t.integer(),
            "title": t.string(),
            "user_id": t.integer(),
        },
    )

    # expose them with policies
    g.expose(
        public,
        # input → output via runtime function
        get_message=random.gen(message),
    )
