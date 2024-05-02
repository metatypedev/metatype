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
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def union_attr(g: Graph):
    rgb = t.struct({"R": t.float(), "G": t.float(), "B": t.float()}, name="Rgb")
    vec = t.struct({"x": t.float(), "y": t.float(), "z": t.float()}, name="Vec")
    pair = t.struct({"first": t.float(), "second": t.float()})
    axis_pairs = t.struct(
        {
            "xy": pair.rename("xy"),
            "xz": pair.rename("xz"),
            "yz": pair.rename("yz"),
        },
        name="AxisPair",
    )
    public = Policy.public()
    deno = DenoRuntime()
    normalize = deno.import_(
        t.struct(
            {"x": t.float(), "y": t.float(), "z": t.float(), "as": t.string()},
            name="Input",
        ),
        t.union([rgb, vec, axis_pairs], name="Output"),
        module="ts/union/vec_normalizer.ts",
        name="normalize",
    ).with_policy(public)
    g.expose(normalize=normalize)


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

tg = union_attr()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "union_node_attr.py"),
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
