from typegraph import TypeGraph, policies, t
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import PureFunMat

with TypeGraph(
    "policies_jwt_format",
    auths=[Auth.hmac256("native")],
) as g:
    some_policy = policies.ctx("role", "myrole")
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
    )
