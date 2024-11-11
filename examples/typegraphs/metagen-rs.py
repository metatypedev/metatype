# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.wasm import WasmRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def metagen_rs(g: Graph):
    idv3 = t.struct(
        {
            "title": t.string(),
            "artist": t.string(),
            "releaseTime": t.datetime(),
            "mp3Url": t.uri(),
            # explicit type names help when generating code
        },
    ).rename("idv3")

    # the wire flavour is availible through a static
    # constructor
    wasm = WasmRuntime.wire("metagen/rust.wasm")

    g.expose(
        Policy.public(),
        remix=wasm.handler(
            idv3,
            idv3,
            name="remix_track",
        ).rename("remix_track"),  # explicit names help
    )
