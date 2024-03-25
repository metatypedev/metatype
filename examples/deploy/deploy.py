from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime

from typegraph.graph.tg_deploy import (
    tg_deploy,
    TypegraphDeployParams,
    BasicAuth,
)
from typegraph.runtimes.python import PythonRuntime
from typegraph.runtimes.wasm import WasmRuntime
from typegraph.utils import unpack_tarb64
from typegraph.wit import ArtifactResolutionConfig, MigrationConfig, MigrationAction

from os import path


@typegraph()
def deploy_example_python(g: Graph):
    deno = DenoRuntime()
    python = PythonRuntime()
    wasm = WasmRuntime()
    prisma = PrismaRuntime("prisma", "POSTGRES")
    pub = Policy.public()

    student = t.struct(
        {
            "id": t.integer(as_id=True),
            "name": t.string(),
        },
        name="Student",
    )

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
        testWasmedge=wasm.from_wasm(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="wasi/rust.wasm",
            func="add",
        ),
        # Prisma
        createStudent=prisma.create(student),
        findManyStudent=prisma.find_many(student),
    )


# Self-deploy
tg = deploy_example_python()

auth = BasicAuth(username="admin", password="password")

config_params = MigrationConfig(
    migration_dir=path.join("prisma-migrations", tg.name),
    global_action=MigrationAction(create=True, reset=True),  # all runtimes
    runtime_actions=None,  # usually set from the cli
)
artifacts_config = ArtifactResolutionConfig(
    prefix=None, dir=None, prisma_migration=config_params
)


res = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url="http://localhost:7890",
        auth=auth,
        artifacts_config=artifacts_config,
        secrets={
            "TG_DEPLOY_EXAMPLE_PYTHON_POSTGRES": "postgresql://postgres:password@localhost:5432/db?schema=e2e7894"
        },
    ),
)

# print(res.serialized)

# migration status.. etc
print(
    "\n".join([msg["text"] for msg in res.typegate["data"]["addTypegraph"]["messages"]])
)

migrations = res.typegate["data"]["addTypegraph"]["migrations"] or []
for item in migrations:
    # what to do with the migration files?
    base_dir = artifacts_config.prisma_migration.migration_dir
    # Convention, however if migration_dir is absolute then you might want to use that instead
    # cwd + tg_name + runtime_name
    full_path = path.join(base_dir, item["runtime"])
    unpack_tarb64(item["migrations"], full_path)
    print(f"Unpacked migrations at {full_path}")
