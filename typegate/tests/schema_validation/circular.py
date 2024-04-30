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
def circular(g: Graph):
    deno = DenoRuntime()

    stars = t.struct({"count": t.integer()})
    medals = t.struct({"title": t.string(), "count": t.integer()})

    user = t.struct(
        {
            "name": t.string(),
            # Edgecase #1: optional that holds a self-reference
            "professor": g.ref("User").optional(),
            # Edgecase #2: array that holds a self-reference
            "parents": t.list(g.ref("User")),
            # Edgecase #3: optional array that holds a self-reference
            "friends": t.list(g.ref("User")).optional(),
            # Edgecase #4: optional object that holds a self-reference
            "paper": t.struct(
                {"title": t.string(), "author": g.ref("User")}, name="Paper"
            ).optional(),
            # Edgecase #5: optional nested object with multiple references
            "root": t.struct(
                {
                    "some_field": t.string(),
                    "depth_one": g.ref("User").optional(),
                    "depth_one_2": g.ref("User"),
                    "depth_two": t.struct({"depth_three": g.ref("User")}),
                },
                name="Speciality",
            ).optional(),
            # Edgecase #6: nested union/either
            "award": t.either(
                [
                    t.struct({"name": t.string()}, name="NamedAward"),
                    t.union([medals, stars]),
                ]
            ).optional(),
        },
        name="User",
    )

    public = Policy.public()

    register_user = deno.import_(
        t.struct({"user": user}, name="Input"),
        t.struct(
            {
                "message": t.string(),
                "user": user,
            },
            name="Output",
        ),
        module="ts/circular.ts",
        name="registerUser",
    ).with_policy(public)

    g.expose(registerUser=register_user)


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

tg = circular()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "circular.py"),
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
