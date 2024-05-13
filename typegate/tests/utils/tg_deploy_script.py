import importlib.util as import_util
import os
import sys
import json

from typegraph.gen.exports.core import (
    ArtifactResolutionConfig,
    MigrationAction,
    MigrationConfig,
)
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import TypegraphDeployParams, tg_deploy

# get command args
cwd = sys.argv[1]
PORT = sys.argv[2]
module_path = sys.argv[3]
secrets_str = sys.argv[4]

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

secrets = json.loads(secrets_str)


tg = tg_func()
deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        base_url=gate,
        auth=auth,
        typegraph_path=os.path.join(cwd, module_name),
        secrets=secrets,
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
