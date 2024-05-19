import os
import sys

from typegraph.gen.exports.core import (
    ArtifactResolutionConfig,
    MigrationAction,
    MigrationConfig,
)
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import TypegraphDeployParams, tg_deploy
from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.python import PythonRuntime

from typegraph import t, typegraph


@typegraph()
def python_dirs(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test_dir=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            deps=["py/nested"],
            name="sayHello",
        ).with_policy(public),
    )


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

pytho_tg = python_dirs()
deploy_result = tg_deploy(
    pytho_tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "python_dirs.py"),
        artifacts_config=ArtifactResolutionConfig(
            dir=cwd,
            prefix=None,
            disable_artifact_resolution=None,
            codegen=None,
            prisma_migration=MigrationConfig(
                migration_dir="prisma-migrations",
                global_action=MigrationAction(reset=False, create=True),
                runtime_actions=None,
            ),
        ),
    ),
)

print(deploy_result.serialized)
