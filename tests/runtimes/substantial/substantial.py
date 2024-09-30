import os
from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.substantial import SubstantialRuntime
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

    sub = SubstantialRuntime(backend)

    save_and_sleep = sub.deno(
        file="workflow.ts",
        name="saveAndSleepExample",
        deps=["imports/common_types.ts"],
    )

    sub_email = sub.deno(
        file="workflow.ts",
        name="eventsAndExceptionExample",
        deps=["imports/common_types.ts"],
    )

    g.expose(
        pub,
        start=save_and_sleep.start(t.struct({"a": t.integer(), "b": t.integer()})),
        workers=save_and_sleep.query_resources(),
        results=save_and_sleep.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
        start_email=sub_email.start(t.struct({"to": t.email()})),
        send_confirmation=sub_email.send(t.boolean(), event_name="confirmation"),
        email_workers=sub_email.query_resources(),
        email_results=sub_email.query_results(t.string()),
        abort_email_confirmation=sub_email.stop(),
    )
