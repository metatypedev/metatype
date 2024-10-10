import os
from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.substantial import SubstantialRuntime, WorkflowFile
from typegraph.runtimes.substantial import Backend


@typegraph()
def substantial(g: Graph):
    pub = Policy.public()

    backend = Backend.dev_memory()
    if "SUB_BACKEND" in os.environ:
        if os.environ["SUB_BACKEND"] == "fs":
            backend = Backend.dev_fs()
        elif os.environ["SUB_BACKEND"] == "redis":
            backend = Backend.redis("SUB_REDIS")

    file = (
        WorkflowFile.deno(file="workflow.ts", deps=["imports/common_types.ts"])
        .import_(["saveAndSleepExample", "eventsAndExceptionExample", "retryExample"])
        .build()
    )

    sub = SubstantialRuntime(backend, [file])

    g.expose(
        pub,
        # common
        stop=sub.stop(),
        results=sub.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
        workers=sub.query_resources(),
        # sleep
        start_sleep=sub.start(t.struct({"a": t.integer(), "b": t.integer()})).reduce(
            {"name": "saveAndSleepExample"}
        ),
        # email
        start_email=sub.start(t.struct({"to": t.string()})).reduce(
            {"name": "eventsAndExceptionExample"}
        ),
        send_confirmation=sub.send(t.boolean()).reduce(
            {"event": {"name": "confirmation", "payload": g.inherit()}}
        ),
        # retry
        start_retry=sub.start(
            t.struct({"fail": t.boolean(), "timeout": t.boolean()})
        ).reduce({"name": "retryExample"}),
        **sub.internals(),
    )
