# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime

from typegraph import t, typegraph


@typegraph()
def python(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        testValidation=(
            python.import_(
                t.struct({"name": t.string()}),
                t.string(),
                module="py_fail/hello_fail.py",
                deps=["py_fail/dep_fail.py"],
                name="sayHello",
            ).with_policy(public),
        )
    )
