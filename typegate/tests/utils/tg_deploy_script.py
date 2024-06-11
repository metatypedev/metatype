import importlib.util as import_util
import json
import os
import sys

from typegraph.gen.exports.core import (
    MigrationAction,
)
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import (
    TypegraphDeployParams,
    tg_deploy,
    TypegateConnectionOptions,
)

# get command args
cwd = sys.argv[1]
PORT = sys.argv[2]
module_path = sys.argv[3]
secrets_str = sys.argv[4]

tg_name = None
# if the typegraph func name is provided,
if len(sys.argv) == 6:
    tg_name = sys.argv[5]

gate = f"http://localhost:{PORT}"
auth = BasicAuth("admin", "password")

# resolve the module
module_name = os.path.basename(module_path)
spec = import_util.spec_from_file_location(module_name, module_path)
module = import_util.module_from_spec(spec)
spec.loader.exec_module(module)

if tg_name is None:
    tg_name = module_name.split(".")[0]
if not hasattr(module, tg_name):
    raise Exception(
        f"Script name {module_name} doesn't have the typegraph name: {tg_name}"
    )


tg = getattr(module, tg_name)

secrets = json.loads(secrets_str)


disable_art_resol = os.environ.get("DISABLE_ART_RES")
codegen = os.environ.get("CODEGEN")
migration_dir = os.environ.get("MIGRATION_DIR") or "prisma-migrations"
global_action_reset = os.environ.get("GLOBAL_ACTION_RESET") or False
if global_action_reset is not False:
    global_action_reset = global_action_reset == "true"

global_action_create = os.environ.get("GLOBAL_ACTION_CREATE") or True
if global_action_reset is not True:
    global_action_create = global_action_create == "true"


deploy_result = tg_deploy(
    tg,
    TypegraphDeployParams(
        typegate=TypegateConnectionOptions(url=gate, auth=auth),
        typegraph_path=os.path.join(cwd, module_name),
        secrets=secrets,
        migrations_dir=migration_dir,
        migration_actions=None,
        default_migration_action=MigrationAction(
            apply=True, reset=global_action_reset, create=global_action_create
        ),
    ),
)

print(deploy_result.serialized)
