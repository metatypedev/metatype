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
def either(g: Graph):
    deno = DenoRuntime()

    # user models

    kid = t.struct(
        {
            "age": t.integer(min=5, max=16),
            "name": t.string(),
            "school": t.string(),
        },
        name="Kid",
    )

    teen = t.struct(
        {
            "age": t.integer(min=17, max=24),
            "name": t.string(),
            "college": t.string(),
        },
        name="Teen",
    )

    adult = t.struct(
        {
            "age": t.integer(min=25),
            "name": t.string(),
            "company": t.string(),
        },
        name="Adult",
    )

    user = t.either([kid, teen, adult], name="User")

    # transaction models

    success_transaction = t.struct(
        {
            "user_id": t.string(),
            "date": t.date(),
        },
        name="SuccessTransaction",
    )
    failed_transaction = t.struct({"reason": t.string()}, name="FailedTransaction")

    response = t.either([success_transaction, failed_transaction], name="Response")

    public = Policy.public()

    regist_user = deno.import_(
        t.struct({"user": user}),
        response,
        module="ts/either/user_register.ts",
        name="regist_user",
    ).with_policy(public)

    g.expose(regist_user=regist_user)


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

tg = either()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "either_node.py"),
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
