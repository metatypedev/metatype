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

from typegraph import t, typegraph


@typegraph()
def wasmedge(g: Graph):
    pub = Policy.public()
    wasmedge = WasmEdgeRuntime()

    g.expose(
        test=wasmedge.wasi(
            t.struct({"a": t.float(), "b": t.float()}),
            t.integer(),
            wasm="artifacts/rust.wasm",
            wasm="artifacts/rust.wasm",
            func="add",
        ).with_policy(pub),
    )


PORT = 7698
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

wasmedge_tg = wasmedge()
serialized, typegate = tg_deploy(
    wasmedge_tg,
    TypegraphDeployParams(
        base_url=gate,
        artifacts_config=ArtifactResolutionConfig(
            prisma_migration=MigrationConfig(
                migration_dir="prisma-migrations",
                global_action=MigrationAction(reset=False, create=True),
            )
        ),
    ),
)

print(serialized)
