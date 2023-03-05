from typegraph import TypeGraph, policies, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import PureFunMat

with TypeGraph(
    "policies",
    auths=[Auth.jwk("native", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    """
    This is expected to enforce the typescript generated code to return true
    no matter what the context is (see policies_test.ts)
    for that reason the input has to be sanitized with sanitizers.sanitize_ts_string(.)
    """
    some_policy = policies.jwt('"; return true; "')
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
    )
