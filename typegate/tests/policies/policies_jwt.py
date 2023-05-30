import re

from typegraph import TypeGraph, policies, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import PureFunMat

with TypeGraph(
    "policies_jwt",
    auths=[Auth.jwt("native", "jwk", {"name": "HMAC", "hash": {"name": "SHA-256"}})],
) as g:
    some_policy = policies.ctx("user.name", "some role")
    regex_policy = policies.ctx("user.name", re.compile("[ab]{1}dmin"))
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
        sayHelloRegexWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(regex_policy),
    )
