# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from ctypes import Union
from dataclasses import dataclass
from enum import Enum
import os
from typing import TYPE_CHECKING, Dict
import json
from typegraph.gen.exports.core import MigrationAction, MigrationConfig

from typegraph.graph.tg_deploy import BasicAuth
from typegraph.wit import ArtifactResolutionConfig
from urllib import request

if TYPE_CHECKING:
    from typegraph.graph.typegraph import TypegraphOutput


VERSION = "0.3.5-0"
PORT = "META_CLI_SERVER_PORT"  # meta-cli instance that executes the current file
SELF_PATH = (
    "META_CLI_TG_PATH"  # path to the current file to uniquely identify the run results
)


class Command(Enum):
    SERIALIZE = "serialize"
    DEPLOY = "deploy"
    UNPACK_MIGRATION = "unpack_migration"


# Types for CLI => SDK
@dataclass
class Typegate:
    endpoint: str
    auth: Union[None, BasicAuth] = None


@dataclass
class CLIConfigRequest:
    typegate: Typegate
    prefix: Union[None, str] = None
    secrets: Dict[str, str]
    artifacts_config: ArtifactResolutionConfig


@dataclass
class CLIServerResponse:
    command: Command
    config: CLIConfigRequest


class Manager:
    port: int
    typegraph: TypegraphOutput
    endpoint: str
    typegraph_path: str

    def is_run_from_cli() -> bool:
        return True if os.environ.get(PORT) else False

    def __init__(self, typegraph: TypegraphOutput, port: Union[None, int] = None):
        self.typegraph = typegraph
        self.typegraph_path = os.environ.get(SELF_PATH)
        if port is None:
            self.port = int(os.environ.get(PORT))
        else:
            self.port = port
        self.endpoint = f"http://localhost:{self.port}"

    def run(self):
        sdk = self.request_command()
        if sdk.command == Command.SERIALIZE:
            self.serialize(sdk.config)
        elif sdk.command == Command.DEPLOY:
            self.deploy(sdk.config)
        elif sdk.command == Command.UNPACK_MIGRATION:
            self.unpack_migration(sdk.config)
        else:
            raise Exception(f"command {sdk.command.value} not supported")

    def serialize(self, config: CLIConfigRequest):
        def fn():
            artifact_cfg = config.artifacts_config
            artifact_cfg.prefix = (
                config.prefix
            )  # prefix from cli overrides the current value
            return self.typegraph.serialize(artifact_cfg)

        return self.relay_result_to_cli(command=Command.SERIALIZE, fn=fn)

    def deploy(config: CLIConfigRequest):
        pass

    def unpack_migration(config: CLIConfigRequest):
        pass

    def request_command(self) -> CLIServerResponse:
        config = self.request_config()
        req = request.Request(f"{self.endpoint}/command")
        raw = request.urlopen(req).read().decode()
        return CLIServerResponse(command=Command(raw["command"]), config=config)

    def request_config(self) -> CLIConfigRequest:
        tg_name = self.typegraph.name
        req = request.Request(f"{self.endpoint}/config?typegraph={tg_name}")
        raw = request.urlopen(req).read().decode()
        cli_res = json.loads(raw)

        prefix = None
        if "prefix" in cli_res:
            prefix = cli_res["prefix"]

        auth = None
        if "auth" in cli_res["endpoint"]:
            auth = BasicAuth(
                cli_res["endpoint"]["username"], cli_res["endpoint"]["password"]
            )

        artifact_config_raw = cli_res["artifactsConfig"]
        return CLIConfigRequest(
            typegate=Typegate(endpoint=cli_res["endpoint"]["typegate"], auth=auth),
            prefix=prefix,
            secrets=cli_res["secrets"],
            artifacts_config=ArtifactResolutionConfig(
                dir=artifact_config_raw["dir"],
                prefix=prefix,
                prisma_migration=MigrationConfig(
                    action=MigrationAction(
                        create=artifact_config_raw["prismaMigration"]["action"][
                            "create"
                        ],
                        reset=artifact_config_raw["prismaMigration"]["action"]["reset"],
                    ),
                    migration_dir=artifact_config_raw["prismaMigration"][
                        "migrationDir"
                    ],
                ),
            ),
        )

    def relay_result_to_cli(self, initiator: Command, fn: callable):
        response = {
            "command": initiator.value,
            "typegraphName": self.typegraph.name,
            "typegraphPath": self.typegraph_path,
        }
        try:
            response["data"] = fn()
        except Exception as e:
            response["error"] = str(e)

        req = request.Request(
            url=f"{self.endpoint}/response",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps(response),
        )

        request.urlopen(req)
