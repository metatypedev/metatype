# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime


@typegraph()
def python_globs(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test_glob=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            deps=["py/nested/*.py"],
            name="sayHello",
        ).with_policy(public),
    )
