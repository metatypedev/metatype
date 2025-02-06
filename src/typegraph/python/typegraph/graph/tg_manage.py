# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from pathlib import Path
from typing import Optional
from pydantic import BaseModel

from typegraph.gen.core import (
    SerializeParams,
    MigrationAction,
    PrismaMigrationConfig,
)
from typegraph.gen.client import rpc_request
from typegraph.graph.shared_types import TypegraphOutput
from typegraph.io import Log
from typegraph.envs.cli import CliEnv, Command, get_cli_env


class DeployParams(BaseModel):
    typegraph_name: str
    typegraph_path: str
    prefix: Optional[str]
    migration_dir: str


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
            typegraph_name=self.typegraph.name,
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

        rpc_request("Serialize", params.model_dump())

    def deploy(self):
        env = self.env
        params = DeployParams(
            typegraph_name=self.typegraph.name,
            typegraph_path=env.typegraph_path,
            migration_dir=self.get_migrations_dir(),
            prefix=env.prefix,
        )

        rpc_request("Deploy", params.model_dump())

    def list(self):
        Log.success({"typegraph": self.typegraph.name})
