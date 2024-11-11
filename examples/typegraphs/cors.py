# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.random import RandomRuntime


# skip:end
@typegraph(
    # highlight-start
    cors=Cors(
        allow_origin=["https://not-this.domain"],
        allow_headers=["x-custom-header"],
        expose_headers=["header-1"],
        allow_credentials=True,
        max_age_sec=60,
    ),
    # highlight-end
)
def cors(g: Graph):
    random = RandomRuntime(seed=0, reset=None)

    g.expose(
        Policy.public(),
        catch_me_if_you_can=random.gen(t.string()),
    )
