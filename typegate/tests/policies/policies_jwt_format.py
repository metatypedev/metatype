from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph(
    auths=[Auth.hmac256("native")],
)
def policies_jwt_format(g: Graph):
    deno = DenoRuntime()
    some_policy = Policy.context("role", "myrole")

    g.expose(
        sayHelloWorld=deno.func(
            t.struct({}),
            t.string(),
            code="""() => "Hello World!" """,
        ).with_policy(some_policy),
    )
