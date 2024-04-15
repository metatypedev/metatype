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
from typegraph.runtimes.wasmedge import WasmEdgeRuntime

from typegraph import t, typegraph


@typegraph()
def wasmedge(g: Graph):
    pub = Policy.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="rust.wasm",
            func="add",
        ).with_policy(pub),
    )


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

wasmedge_tg = wasmedge()
deploy_result = tg_deploy(
    wasmedge_tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "wasmedge.py"),
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
