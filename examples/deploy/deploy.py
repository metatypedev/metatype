from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime

from typegraph.graph.tg_deploy import tg_deploy, TypegraphDeployParams, BasicAuth
from typegraph.runtimes.python import PythonRuntime
from typegraph.runtimes.wasmedge import WasmEdgeRuntime
from typegraph.wit import ArtifactResolutionConfig, MigrationConfig, MigrationAction


@typegraph(disable_auto_serialization=True)  # disable print
def deploy_example_python(g: Graph):
    deno = DenoRuntime()
    python = PythonRuntime()
    wasmedge = WasmEdgeRuntime()
    pub = Policy.public()

    g.expose(
        pub,
        test=deno.static(t.struct({"a": t.string()}), {"a": "HELLO"}),
        # Deno
        sayHello=deno.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="scripts/deno/say_hello.ts",
            name="sayHello",
        ),
        sayHelloLambda=deno.func(
            t.struct({"name": t.string()}),
            t.string(),
            code="({ name }) => `Hello ${name} from deno lambda`",
        ),
        # Python
        sayHelloPyLambda=python.from_lambda(
            t.struct({"name": t.string()}),
            t.string(),
            function=lambda obj: f"Hello {obj['name']} from python lambda",
        ),
        sayHelloPyMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="scripts/python/say_hello.py",
            name="sayHello",
        ),
        # Wasmedge
        testWasmedge=wasmedge.wasi(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="wasi/rust.wasm",
            func="add",
        ),
    )


auth = BasicAuth(username="admin", password="password")

migration_config = MigrationConfig(
    migration_dir="prisma/migration", action=MigrationAction(create=True, reset=False)
)

res = tg_deploy(
    deploy_example_python(),
    TypegraphDeployParams(
        base_url="http://localhost:7890",
        auth=auth,
        cli_version="0.3.3",
        artifacts_config=ArtifactResolutionConfig(migration_config),
    ),
)

print(res)
