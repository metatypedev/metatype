import importlib.util as import_util
import os
import sys

from typegraph.gen.exports.core import (
    ArtifactResolutionConfig,
    MigrationAction,
    MigrationConfig,
)
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import TypegraphDeployParams, tg_deploy

cwd = sys.argv[1]
PORT = sys.argv[2]
module_path = sys.argv[3]
gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

# resolve the module
module_name = os.path.basename(module_path)
spec = import_util.spec_from_file_location(module_name, module_path)
module = import_util.module_from_spec(spec)
spec.loader.exec_module(module)

tg_name = module_name.split(".")[0]
if not hasattr(module, tg_name):
    raise Exception("Script name doesn't match the typegraph name")

tg_func = getattr(module, tg_name)


tg = tg_func()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, module_name),
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
