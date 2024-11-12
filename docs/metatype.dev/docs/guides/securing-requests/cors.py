# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.random import RandomRuntime


# skip:end
@typegraph(
    # highlight-next-line
    cors=Cors(
        # highlight-next-line
        allow_origin=["https://not-this.domain"],
        # highlight-next-line
        allow_headers=["x-custom-header"],
        # highlight-next-line
        expose_headers=["header-1"],
        # highlight-next-line
        allow_credentials=True,
        # highlight-next-line
        max_age_sec=60,
        # highlight-next-line
    ),
)
def auth(g: Graph):
    random = RandomRuntime(seed=0)
    public = Policy.public()

    g.expose(
        public,
        catch_me_if_you_can=random.gen(t.string()),
    )
