from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import PureFunMat

with TypeGraph("policies", auths=[Auth.jwk("native")]) as g:
    some_policy = policies.jwt("user.name", "some role")
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            PureFunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
    )
