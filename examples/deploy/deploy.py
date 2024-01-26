from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime

from typegraph.graph.tg_deploy import tg_deploy, TypegraphDeployParams, BasicAuth


@typegraph(disable_auto_serialization=True)  # disable print
def deploy_example_python(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.expose(
        pub,
        test=deno.static(t.struct({"a": t.string()}), {"a": "HELLO"}),
    )


auth = BasicAuth(username="admin", password="password")

res = tg_deploy(
    deploy_example_python(),
    TypegraphDeployParams(
        base_url="http://localhost:7890",
        auth=auth,
        cli_version="0.3.2",
    ),
)

print(res)
