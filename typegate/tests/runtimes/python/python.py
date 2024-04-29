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


def test(x):
    return x["a"]


def identity(x):
    return x["input"]


def stackoverflow(x):
    def fn():
        return fn()

    if x["enable"]:
        fn()
    return x["enable"]


def infinite_loop(x):
    import time

    # while x["enable"]:
    #     print("tic tac")
    # blocking
    time.sleep(20000)  # still blocking main thread
    return x["enable"]


tpe = t.struct({"a": t.integer(), "b": t.struct({"c": t.list(t.string())})})


@typegraph()
def python(g: Graph):
    public = Policy.public()
    python = PythonRuntime()

    g.expose(
        test=python.from_lambda(
            t.struct({"a": t.string()}),
            t.string(),
            lambda x: x["a"],
        ).with_policy(public),
        testDef=python.from_def(
            t.struct({"a": t.string()}),
            t.string(),
            test,
        ).with_policy(public),
        testMod=python.import_(
            t.struct({"name": t.string()}),
            t.string(),
            module="py/hello.py",
            deps=["py/nested/dep.py"],
            name="sayHello",
        ).with_policy(public),
        identity=python.from_def(
            t.struct({"input": tpe}),
            tpe,
            identity,
        ).with_policy(public),
        stackOverflow=python.from_def(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            stackoverflow,
        ).with_policy(public),
        infiniteLoop=python.from_def(
            t.struct({"enable": t.boolean()}),
            t.boolean(),
            infinite_loop,
        ).with_policy(public),
    )


cwd = sys.argv[1]
PORT = sys.argv[2]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

pytho_tg = python()
deploy_result = tg_deploy(
    pytho_tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, "python.py"),
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
