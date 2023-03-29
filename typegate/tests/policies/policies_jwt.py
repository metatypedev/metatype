from typegraph import TypeGraph, policies, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import PureFunMat

with TypeGraph(
    "policies_jwt",
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    some_policy = policies.jwt("user.name", "some role")
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
    )
