# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import traceback

from typegraph.gen.exports.core import (
    FinalizeParams,
    MigrationAction,
    PrismaMigrationConfig,
)
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.graph.tg_deploy import (
    TypegateConnectionOptions,
    TypegraphDeployParams,
    tg_deploy,
)
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
        else:
            raise Exception("unreachable")

    def serialize(self):
        env = self.env
        params = FinalizeParams(
            typegraph_path=env.typegraph_path,
            prefix=env.prefix,
            artifact_resolution=True,
            codegen=False,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir=env.migrations_dir,
                migration_actions=[],
                default_migration_action=MigrationAction(
                    apply=True,
                    create=False,
                    reset=False,
                ),
            ),
        )

        try:
            res = self.typegraph.serialize(params)
            Log.success(res.tgJson, noencode=True)
        except Exception as err:
            Log.debug(traceback.format_exc())
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})

    def deploy(self):
        env = self.env
        deploy_data = Rpc.get_deploy_data(self.typegraph.name)

        params = FinalizeParams(
            typegraph_path=env.typegraph_path,
            prefix=env.prefix,
            artifact_resolution=True,
            codegen=False,
            prisma_migration=PrismaMigrationConfig(
                migrations_dir=env.migrations_dir,
                migration_actions=list(deploy_data.migration_actions.items()),
                default_migration_action=deploy_data.default_migration_action,
            ),
        )

        # hack for allowing tg.serialize(config) to be called more than once
        frozen_out = freeze_tg_output(params, self.typegraph)
        try:
            frozen_serialized = frozen_out.serialize(params)  # noqa
        except Exception as err:
            Log.debug(traceback.format_exc())
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})
            return

        if params.codegen:
            raise Exception("not implemented")

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
                migrations_dir=env.migrations_dir,
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
            Log.failure({"typegraph": self.typegraph.name, "error": str(err)})
            return
