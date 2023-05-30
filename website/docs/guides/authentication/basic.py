# skip:start
from typegraph import TypeGraph, policies, t
from typegraph.runtimes.deno import DenoRuntime

# skip:end

with TypeGraph(
    "basic_authentification",
    auths=[
        # highlight-next-line
        TypeGraph.Auth.basic(["admin"]),
    ],
    # skip:next-line
    cors=TypeGraph.Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
) as g:
    deno = DenoRuntime()
    public = policies.public()

    ctx = t.struct({"username": t.string().optional().from_context("username")})

    g.expose(
        get_context=deno.identity(ctx),
        default_policy=[public],
    )
