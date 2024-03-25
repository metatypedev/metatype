from typegraph import typegraph, Graph, Policy, t
from typegraph.runtimes import DenoRuntime


@typegraph()
def invalid_ref(g: Graph):
    public = Policy.public()
    deno = DenoRuntime()

    user = t.struct({"id": t.uuid(), "posts": t.list(g.ref("Post"))})

    g.expose(public, user=deno.identity(user))
