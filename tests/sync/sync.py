# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph, Policy, Graph
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.substantial import Backend, SubstantialRuntime, WorkflowFile


@typegraph()
def sync(g: Graph):
    deno = DenoRuntime()
    backend = Backend.redis("SUB_REDIS")

    file = WorkflowFile.deno(file="scripts/workflow.ts").import_(["sayHello"]).build()

    sub = SubstantialRuntime(backend, [file])
    public = Policy.public()

    g.expose(
        hello=deno.import_(
            t.struct({"name": t.string()}),
            t.string(),
            name="hello",
            module="scripts/hello.ts",
            secrets=["ULTRA_SECRET"],
        ).with_policy(public),
        helloWorkflow=sub.start(t.struct({"name": t.string()})),
    )
