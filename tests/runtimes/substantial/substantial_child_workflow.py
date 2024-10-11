import os
from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.substantial import SubstantialRuntime, WorkflowFile
from typegraph.runtimes.substantial import Backend


@typegraph()
def substantial_child_workflow(g: Graph):
    pub = Policy.public()

    backend = Backend.dev_memory()
    if "SUB_BACKEND" in os.environ:
        if os.environ["SUB_BACKEND"] == "fs":
            backend = Backend.dev_fs()
        elif os.environ["SUB_BACKEND"] == "redis":
            backend = Backend.redis("SUB_REDIS")

    file = (
        WorkflowFile.deno(file="child_workflow.ts", deps=["imports/common_types.ts"])
        .import_(["bumpPackage", "bumpAll"])
        .build()
    )

    sub = SubstantialRuntime(backend, [file])

    g.expose(
        pub,
        # common
        stop=sub.stop(),
        results=sub.query_results(t.string().rename("ResultOrError")),
        workers=sub.query_resources(),
        start=sub.start(t.struct({"packages": t.list(t.string())})).reduce(
            {"name": "bumpAll"}
        ),
        **sub.internals(),
    )
