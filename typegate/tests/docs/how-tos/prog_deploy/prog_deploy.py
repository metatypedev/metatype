import os
from os import path
import sys

from typegraph.gen.exports.core import MigrationAction
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import (
    TypegraphDeployParams,
    tg_deploy,
    TypegateConnectionOptions,
)
from typegraph.runtimes.deno import DenoRuntime

from typegraph import Graph, Policy, t, typegraph

# Your typegraph


@typegraph()
def example(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.expose(
        pub,
        sayHello=deno.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="scripts/say_hello.ts",
            name="sayHello",
        ),
    )


# Configure your deployment
cwd = sys.argv[1]
PORT = sys.argv[2]


def deploy():
    cwd = os.getcwd()

    base_url = f"http://localhost:{PORT}"
    auth = BasicAuth("admin", "password")

    config: TypegraphDeployParams = (
        TypegraphDeployParams(
            typegate=TypegateConnectionOptions(url=base_url, auth=auth),
            typegraph_path=os.path.join(cwd, "path-to-typegraph"),
            prefix="<prefix>",
            secrets={},
            migrations_dir=path.join("prisma-migrations", example.name),
            migration_actions=None,
            default_migration_action=MigrationAction(
                apply=True,
                reset=True,  # allow destructive migrations
                create=True,
            ),
        ),
    )

    # Deploy to typegate
    result = tg_deploy(example, config)  # pass your typegraph function name
    return result


res = deploy()
