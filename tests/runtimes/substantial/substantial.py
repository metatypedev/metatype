from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.substantial import Backend


@typegraph()
def substantial(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()
    backend = Backend.memory()

    save_and_sleep = deno.workflow(
        backend, file="workflow.ts", name="saveAndSleep", deps=["common_types.ts"]
    )

    g.expose(
        pub,
        start=save_and_sleep.start(t.struct({"a": t.integer(), "b": t.integer()})),
        stop=save_and_sleep.stop(),
        send=save_and_sleep.send(t.string().rename("Payload")),
        ressources=save_and_sleep.query_ressources(),
        results=save_and_sleep.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
    )
