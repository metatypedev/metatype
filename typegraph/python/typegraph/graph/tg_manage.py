# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
import traceback
from enum import Enum
from typing import Union, Optional

from typegraph.gen.exports.core import (
    FinalizeParams,
    PrismaMigrationConfig,
)
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.graph.tg_deploy import TypegateConnectionOptions, TypegraphDeployParams, tg_deploy
from typegraph.utils import freeze_tg_output
from typegraph.io import Log, GlobalConfig, Rpc, TypegraphConfig

PORT = "MCLI_SERVER_PORT"  # meta-cli instance that executes the current file
SELF_PATH = (
    "MCLI_TG_PATH"  # path to the current file to uniquely identify the run results
)

class Command(Enum):
    SERIALIZE = "serialize"
    DEPLOY = "deploy"

_env_command = os.environ.get("MCLI_ACTION")
command = None
if _env_command is not None:
    if _env_command not in [Command.SERIALIZE.value, Command.DEPLOY.value]:
        raise Exception(f"MCLI_ACTION env variable must be one of {Command.SERIALIZE.value}, {Command.DEPLOY.value}")
    command = Command(_env_command)


_global_config: Optional[GlobalConfig] = None
def get_global_config():
    global _global_config
    if _global_config is None:
        _global_config = Rpc.get_global_config()
    return _global_config

class Manager:
    typegraph: TypegraphOutput
    typegraph_path: str
    typegraph_config: TypegraphConfig
    global_config: GlobalConfig

    def is_run_from_cli() -> bool:
        return os.environ.get("MCLI_ACTION") is not None

    def __init__(self, typegraph: TypegraphOutput, port: Union[None, int] = None):
        self.typegraph = typegraph
        tg_path = os.environ.get(SELF_PATH)
        if tg_path is None:
            raise Exception(f"{SELF_PATH} env variable not set")
        self.typegraph_path = tg_path
        self.global_config = get_global_config()
        self.typegraph_config = Rpc.get_typegraph_config(typegraph.name)

    def run(self):
        params = FinalizeParams(
            typegraph_path=self.typegraph_path,
            prefix=self.global_config.prefix,
            artifact_resolution=True,
            codegen=False,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir=self.typegraph_config.migrations_dir,
                migration_actions=[(k, v) for k, v in self.typegraph_config.migration_actions.items()],
                default_migration_action=self.typegraph_config.default_migration_action
            )
        )

        if command is None:
            raise Exception("MCLI_ACTION env variable required")
        elif command == Command.SERIALIZE:
            self.serialize(params)
        elif command == Command.DEPLOY:
            self.deploy(params)
        else:
            raise Exception(f"command {command.value} not supported")

    def serialize(self, config: FinalizeParams):
        try:
            res = self.typegraph.serialize(config)
            Log.success(res.tgJson, noencode=True)
        except Exception as err:
            Log.debug(traceback.format_exc())
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})

    def deploy(self, config: FinalizeParams):
        typegate = self.global_config.typegate
        if typegate is None:
            raise Exception("unexpected")
        if typegate.auth is None:
            raise Exception(
                f'{self.typegraph.name}" received null or undefined "auth" field on the configuration'
            )

        # hack for allowing tg.serialize(config) to be called more than once
        frozen_out = freeze_tg_output(config, self.typegraph)
        try:
            frozen_serialized = frozen_out.serialize(config)  # noqa
        except Exception as err:
            Log.debug(traceback.format_exc())
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})
            return

        if config.codegen:
            raise Exception("not implemented")

        try:
            params = TypegraphDeployParams(
                typegate=TypegateConnectionOptions(
                    url=typegate.endpoint,
                    auth=typegate.auth,
                ),
                typegraph_path = self.typegraph_path,
                prefix=config.prefix,
                secrets=self.typegraph_config.secrets,
                migrations_dir=self.typegraph_config.migrations_dir,
                migration_actions = self.typegraph_config.migration_actions,
                default_migration_action=self.typegraph_config.default_migration_action,
            )
            ret = tg_deploy(frozen_out, params)
            response = ret.response

            Log.debug("response", response)

            if not isinstance(response, dict):
                raise Exception("unexpected")
            Log.success({ "typegraph": self.typegraph.name, **response })
        except Exception as err:
            Log.debug(traceback.format_exc())
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})
            return
