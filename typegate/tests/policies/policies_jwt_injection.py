from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph(
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})]
)
def policies_jwt_injection(g: Graph):
    """
    This is expected to enforce the typescript generated code to return true
    no matter what the context is (see policies_test.ts)
    for that reason the input has to be sanitized with sanitizers.sanitize_ts_string(.)
    """

    deno = DenoRuntime()
    some_policy = Policy.context("field", '"; return true; "')

    g.expose(
        sayHelloWorld=deno.func(
            t.struct({}), t.string(), code="""() => "Hello World!"""
        ).with_policy(some_policy),
    )
