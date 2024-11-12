# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from os import path

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.tg_deploy import (
    BasicAuth,
    TypegateConnectionOptions,
    TypegraphDeployParams,
    tg_deploy,
)
from typegraph.providers.prisma import PrismaRuntime
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.python import PythonRuntime
from typegraph.utils import unpack_tarb64


@typegraph()
def deploy_example_python(g: Graph):
    deno = DenoRuntime()
    python = PythonRuntime()
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
            deps=["scripts/python/import_.py"],
            name="sayHello",
        ),
        # Prisma
        createStudent=prisma.create(student),
        findManyStudent=prisma.find_many(student),
    )


# Self-deploy
auth = BasicAuth(username="admin", password="password")

deploy_params = TypegraphDeployParams(
    typegate=TypegateConnectionOptions(
        url="http://localhost:7890",
        auth=auth,
    ),
    migrations_dir=path.join("prisma-migrations", deploy_example_python.name),
    default_migration_action=None,
    typegraph_path="./deploy.py",
)

res = tg_deploy(deploy_example_python, deploy_params)

# print(res.serialized)
if "errors" in res.response:
    print(res.response)
    exit()

assert isinstance(res.response, dict)

# migration status.. etc
print("\n".join([msg["text"] for msg in res.response["messages"]]))


migrations = res.response["migrations"] or []
for item in migrations:
    # what to do with the migration files?
    base_dir = deploy_params.migrations_dir
    assert base_dir
    # Convention, however if migration_dir is absolute then
    # you might want to use that instead
    # cwd + tg_name + runtime_name
    full_path = path.join(base_dir, item["runtime"])
    unpack_tarb64(item["migrations"], full_path)
    print(f"Unpacked migrations at {full_path}")
