# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import traceback
from pathlib import Path

from typegraph.gen.exports.core import (
    SerializeParams,
    MigrationAction,
    PrismaMigrationConfig,
)
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.graph.tg_deploy import (
    TypegateConnectionOptions,
    TypegraphDeployParams,
    tg_deploy,
)
from typegraph.wit import ErrorStack
from typegraph.utils import freeze_tg_output
from typegraph.io import Log, Rpc
from typegraph.envs.cli import CliEnv, Command, get_cli_env


class Manager:
    typegraph: TypegraphOutput
    env: CliEnv

    def __init__(self, typegraph: TypegraphOutput):
        self.typegraph = typegraph
        self.env = get_cli_env()

    def run(self):
        if self.env.command == Command.SERIALIZE:
            self.serialize()
        elif self.env.command == Command.DEPLOY:
            self.deploy()
        elif self.env.command == Command.LIST:
            self.list()
        else:
            raise Exception("unreachable")

    def get_migrations_dir(self):
        return str(Path(self.env.migrations_dir) / self.typegraph.name)

    def serialize(self):
        env = self.env
        params = SerializeParams(
            typegraph_path=env.typegraph_path,
            prefix=env.prefix,
            artifact_resolution=env.artifact_resolution,
            codegen=False,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir=self.get_migrations_dir(),
                migration_actions=[],
                default_migration_action=MigrationAction(
                    apply=True,
                    create=False,
                    reset=False,
                ),
            ),
            pretty=False,
        )

        try:
            res = self.typegraph.serialize(params)
            Log.success(res.tgJson, noencode=True)
        except Exception as err:
            Log.debug(traceback.format_exc())
            if isinstance(err, ErrorStack):
                Log.failure({"typegraph": self.typegraph.name, "errors": err.stack})
            else:
                Log.failure({"typegraph": self.typegraph.name, "errors": [str(err)]})

    def deploy(self):
        env = self.env
        deploy_data = Rpc.get_deploy_data(self.typegraph.name)

        params = SerializeParams(
            typegraph_path=env.typegraph_path,
            prefix=env.prefix,
            artifact_resolution=True,
            codegen=False,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir=self.get_migrations_dir(),
                migration_actions=list(deploy_data.migration_actions.items()),
                default_migration_action=deploy_data.default_migration_action,
            ),
            pretty=False,
        )

        # hack for allowing tg.serialize(config) to be called more than once
        frozen_out = freeze_tg_output(params, self.typegraph)
        try:
            frozen_out.serialize(params)
        except Exception as err:
            Log.debug(traceback.format_exc())
            if isinstance(err, ErrorStack):
                Log.failure({"typegraph": self.typegraph.name, "errors": err.stack})
            else:
                Log.failure({"typegraph": self.typegraph.name, "errors": [str(err)]})
            return

        try:
            deploy_target = Rpc.get_deploy_target()
            params = TypegraphDeployParams(
                typegate=TypegateConnectionOptions(
                    url=deploy_target.base_url,
                    auth=deploy_target.auth,
                ),
                typegraph_path=env.typegraph_path,
                prefix=env.prefix,
                secrets=deploy_data.secrets,
                migrations_dir=self.get_migrations_dir(),
                migration_actions=deploy_data.migration_actions,
                default_migration_action=deploy_data.default_migration_action,
            )
            ret = tg_deploy(frozen_out, params)
            response = ret.response

            Log.debug("response", response)

            if not isinstance(response, dict):
                raise Exception("unexpected")
            Log.success({"typegraph": self.typegraph.name, **response})
        except Exception as err:
            Log.debug(traceback.format_exc())
            if isinstance(err, ErrorStack):
                Log.failure({"typegraph": self.typegraph.name, "errors": err.stack})
            else:
                Log.failure({"typegraph": self.typegraph.name, "errors": [str(err)]})
            return

    def list(self):
        Log.success({"typegraph": self.typegraph.name})
