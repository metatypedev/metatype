from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.substantial import SubstantialRuntime
from typegraph.runtimes.substantial import Backend


@typegraph()
def substantial(g: Graph):
    pub = Policy.public()

    backend = Backend.memory()
    save_and_sleep = SubstantialRuntime.deno(
        backend,
        file="workflow.ts",
        name="saveAndSleepExample",
        deps=["common_types.ts"],
    )

    sub_email = SubstantialRuntime.deno(
        backend,
        file="workflow.ts",
        name="eventsAndExceptionExample",
        deps=["common_types.ts"],
    )

    g.expose(
        pub,
        start=save_and_sleep.start(t.struct({"a": t.integer(), "b": t.integer()})),
        ressources=save_and_sleep.query_ressources(),
        results=save_and_sleep.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
        start_email=sub_email.start(t.struct({"to": t.email()})),
        send_confirmation=sub_email.send(t.boolean()),
        ask_ongoing_emails=sub_email.query_ressources(),
        ask_email_results=sub_email.query_results(t.string()),
        abort_email_confirmation=sub_email.stop(),
    )
