# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.http import HttpRuntime


# skip:end
@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def triggers(g: Graph):
    # skip:start
    public = Policy.public()
    http = HttpRuntime("https://random.org/api")
    # skip:end
    # ...
    g.expose(
        public,
        flip=http.get("/flip_coin", t.struct({}), t.enum(["head", "tail"])),
    )
