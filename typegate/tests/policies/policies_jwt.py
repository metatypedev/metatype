from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.graph.models import Auth
from typegraph.runtimes.deno import FunMat

# Note Auth.jwk
with TypeGraph("policies", auths=[Auth.jwk("native")]) as g:
    some_policy = policies.jwt("user selected role", "some role")
    g.expose(
        sayHelloWorld=t.func(
            t.struct(),
            t.string(),
            FunMat("""() => "Hello World!" """),
        ).add_policy(some_policy),
    )
