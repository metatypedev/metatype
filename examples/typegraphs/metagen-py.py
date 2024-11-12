# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# skip:start
from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.python import PythonRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def metagen_py(g: Graph):
    idv3 = t.struct(
        {
            "title": t.string(),
            "artist": t.string(),
            "releaseTime": t.datetime(),
            "mp3Url": t.uri(),
        },
    ).rename("idv3")

    python = PythonRuntime()

    g.expose(
        Policy.public(),
        remix=python.import_(
            idv3,
            idv3,
            module="./metagen/py/remix.py",
            deps=["./metagen/py/remix_types.py"],
            name="remix_track",
        ).rename("remix_track"),
    )
