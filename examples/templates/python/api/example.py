# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes import PythonRuntime


@typegraph()
def example(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    hello = python.from_lambda(
        t.struct({"world": t.string()}),
        t.string(),
        lambda x: f"Hello {x['world']}!",
    )

    g.expose(public, hello=hello)
