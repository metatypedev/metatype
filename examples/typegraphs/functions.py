# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes import DenoRuntime, HttpRuntime


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def functions(g: Graph):
    # skip:end
    deno = DenoRuntime()
    deno.func(
        t.struct({"input": t.string()}),
        t.string(),
        code="({ input }) => `hello ${input}`",  # with logic
    )

    http = HttpRuntime("https://random.org/api")
    http.get(
        "/flip_coin",
        t.struct({}),
        t.enum(["head", "tail"]),
    )
