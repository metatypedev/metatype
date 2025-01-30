# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime, PythonModule

from typegraph import t, typegraph


@typegraph()
def python_duplicate_artifact(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    mod = PythonModule(
        source="py/hello.py",
        deps=["py/nested/dep.py"],
    )

    g.expose(
        testMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module=mod.import_("sayHello"),
        ).with_policy(public),
        testModDuplicate=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module=mod.import_("sayHello"),
        ).with_policy(public),
    )
