import os
import sys

from typegraph.gen.exports.core import (
    ArtifactResolutionConfig,
    MigrationAction,
    MigrationConfig,
)
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import TypegraphDeployParams, tg_deploy
from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph()
def deno_reload(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        fire=deno.import_(
            t.struct({}),
            t.float(),
            module=os.environ["DYNAMIC"],
            name="fire",
        ).with_policy(public),
    )


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

deno_tg = deno_reload()
deploy_result = tg_deploy(
    deno_tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "deno_reload.py"),
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
