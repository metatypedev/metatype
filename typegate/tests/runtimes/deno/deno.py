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

from typegraph import effects, t, typegraph


@typegraph()
def deno(g: Graph):
    public = Policy.public()

    deno = DenoRuntime()

    number_input = t.struct({"numbers": t.list(t.float())})

    g.expose(
        public,
        add=deno.func(
            t.struct({"first": t.float(), "second": t.float()}),
            t.float(),
            code="({ first, second }) => first + second",
        ),
        sum=deno.import_(
            t.struct({"numbers": t.list(t.integer())}),
            t.integer(),
            module="ts/deno.ts",
            name="sum",
        ),
        count=deno.import_(
            t.struct(),
            t.integer(min=0),
            module="ts/deno.ts",
            name="counter",
            effect=effects.update(),
        ),
        min=deno.import_(number_input, t.float(), module="ts/math.ts", name="min"),
        max=deno.import_(number_input, t.float(), module="ts/math.ts", name="maxAsync"),
        log=deno.import_(
            t.struct({"number": t.float(), "base": t.float().optional()}),
            t.float(),
            module="ts/math-npm.ts",
            name="log",
        ),
        static=deno.static(t.struct({"x": t.list(t.integer())}), {"x": [1]}),
        infiniteLoop=deno.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            code="({ enable }) => { while(enable); return enable; }",
        ),
        stackOverflow=deno.func(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            code="""
                ({ enable }) => {
                    const fn = () => fn();
                    enable && fn();
                    return enable;
                }
                """,
        ),
    )


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

deno_tg = deno()
deploy_result = tg_deploy(
    deno_tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "deno.py"),
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
