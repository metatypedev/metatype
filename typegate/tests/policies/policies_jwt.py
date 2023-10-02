import re

from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.graph.params import Auth
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph(
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})]
)
def policies_jwt(g: Graph):
    deno = DenoRuntime()

    some_policy = Policy.context("user.name", "some role")
    regex_policy = Policy.context("user.name", re.compile("[ab]{1}dmin"))

    g.expose(
        sayHelloWorld=deno.func(
            t.struct({}),
            t.string(),
            code="""() => "Hello World!" """,
        ).with_policy(some_policy),
        sayHelloRegexWorld=deno.func(
            t.struct({}), t.string(), code="""() => "Hello World!" """
        ).with_policy(regex_policy),
    )
