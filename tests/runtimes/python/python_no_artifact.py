# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime

from typegraph import t, typegraph


@typegraph()
def python_no_artifact(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test_lambda=python.from_lambda(
            t.struct({"a": t.string()}),
            t.string(),
            lambda x: x["a"],
        ).with_policy(public),
    )
