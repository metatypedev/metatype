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

    email = sub.deno(
        file="workflow.ts",
        name="eventsAndExceptionExample",
        deps=["imports/common_types.ts"],
    )

    retry = sub.deno(
        file="workflow.ts",
        name="retryExample",
        deps=["imports/common_types.ts"],
    )

    g.expose(
        pub,
        # sleep
        start=save_and_sleep.start(t.struct({"a": t.integer(), "b": t.integer()})),
        workers=save_and_sleep.query_resources(),
        results=save_and_sleep.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
        # email
        start_email=email.start(t.struct({"to": t.email()})),
        send_confirmation=email.send(t.boolean(), event_name="confirmation"),
        email_workers=email.query_resources(),
        email_results=email.query_results(t.string()),
        abort_email_confirmation=email.stop(),
        # retry
        start_retry=retry.start(t.struct({"fail": t.boolean()})),
        retry_workers=retry.query_resources(),
        retry_results=retry.query_results(t.string()),
        abort_retry=retry.stop(),
    )
