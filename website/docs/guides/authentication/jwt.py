# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime

# skip:end

with TypeGraph(
    "jwt_authentification",
    auths=[
        # highlight-next-line
        TypeGraph.Auth.hmac256("custom"),
    ],
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    deno = DenoRuntime()
    public = policies.public()

    ctx = t.struct(
        {"your_own_content": t.string().optional().from_context("your_own_content")}
    )

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
