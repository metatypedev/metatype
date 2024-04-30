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
def union_quantifier(g: Graph):
    metadata = t.struct(
        {
            "label": t.string(),
            "content": t.string(),
            "source": t.string().optional(),
        }
    )

    smartphone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]),
            "metadatas": t.list(metadata).optional(),
        },
        name="SmartPhone",
    )

    basic_phone = t.struct(
        {
            "name": t.string(),
            "camera": t.integer().optional(),
            "battery": t.integer(),
            "os": t.enum(["Android", "iOS"]).optional(),
            "metadatas": t.list(metadata).optional(),
        },
        name="BasicPhone",
    )

    phone = t.union([basic_phone, smartphone])

    # phone_register_materializer = ModuleMat("ts/union/phone_register.ts")

    public = Policy.public()
    deno = DenoRuntime()
    register_phone = deno.import_(
        t.struct({"phone": phone}),
        t.struct(
            {
                "message": t.string(),
                "type": t.string(),
                "phone": phone,
            }
        ),
        module="ts/union/phone_register.ts",
        name="registerPhone",
    ).with_policy(public)

    g.expose(registerPhone=register_phone)


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

tg = union_quantifier()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "union_node_quantifier.py"),
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
