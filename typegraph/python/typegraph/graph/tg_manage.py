# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from enum import Enum
import os
from typing import Dict, Union
import json
from typegraph.gen.exports.core import (
    MigrationAction,
    MigrationConfig,
    ArtifactResolutionConfig,
)

from typegraph.graph.tg_deploy import TypegraphDeployParams, tg_deploy
from urllib import request, parse

from typegraph.graph.shared_types import BasicAuth, TypegraphOutput


PORT = "META_CLI_SERVER_PORT"  # meta-cli instance that executes the current file
SELF_PATH = (
    "META_CLI_TG_PATH"  # path to the current file to uniquely identify the run results
)


class Command(Enum):
    SERIALIZE = "serialize"
    DEPLOY = "deploy"


# Types for CLI => SDK
@dataclass
class Typegate:
    endpoint: str
    auth: Union[None, BasicAuth] = None


@dataclass
class CLIConfigRequest:
    typegate: Typegate
    secrets: Dict[str, str]
    artifacts_config: ArtifactResolutionConfig
    prefix: Union[None, str] = None


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
        else:
            raise Exception(f"command {sdk.command.value} not supported")

    def serialize(self, config: CLIConfigRequest):
        def fn():
            artifact_cfg = config.artifacts_config
            artifact_cfg.prefix = (
                config.prefix
            )  # prefix from cli overrides the current value
            return self.typegraph.serialize(artifact_cfg).tgJson

        return self.relay_result_to_cli(initiator=Command.SERIALIZE, fn=fn)

    def deploy(self, config: CLIConfigRequest):
        typegate = config.typegate
        if typegate.auth is None:
            raise Exception(
                f'{self.typegraph.name}" received null or undefined "auth" field on the configuration'
            )

        def fn():
            artifacts_config = config.artifacts_config
            artifacts_config.prefix = config.prefix  # priority
            params = TypegraphDeployParams(
                base_url=typegate.endpoint,
                auth=typegate.auth,
                artifacts_config=artifacts_config,
                secrets=config.secrets,
            )
            ret = tg_deploy(self.typegraph, params)
            return ret.typegate

        return self.relay_result_to_cli(initiator=Command.DEPLOY, fn=fn)

    def request_command(self) -> CLIServerResponse:
        config = self.request_config()
        req = request.Request(f"{self.endpoint}/command")
        raw = request.urlopen(req).read().decode()
        cli_rep = json.loads(raw)["data"]
        return CLIServerResponse(command=Command(cli_rep), config=config)

    def request_config(self) -> CLIConfigRequest:
        tg_name = self.typegraph.name
        tg_path = parse.quote(self.typegraph_path)
        req = request.Request(
            f"{self.endpoint}/config?typegraph={tg_name}&typegraph_path={tg_path}"
        )
        raw = request.urlopen(req).read().decode()
        cli_res = json.loads(raw)["data"]

        prefix = None
        if exist_and_not_null(cli_res, "prefix"):
            prefix = cli_res["prefix"]

        auth = None
        if exist_and_not_null(cli_res["typegate"], "auth"):
            raw_auth = cli_res["typegate"]["auth"]
            auth = BasicAuth(raw_auth["username"], raw_auth["password"])

        artifact_config_raw = cli_res["artifactsConfig"]
        migration_action_raw = artifact_config_raw["prismaMigration"]

        return CLIConfigRequest(
            typegate=Typegate(endpoint=cli_res["typegate"]["endpoint"], auth=auth),
            prefix=prefix,
            secrets=cli_res["secrets"],
            artifacts_config=ArtifactResolutionConfig(
                dir=artifact_config_raw["dir"],
                prefix=prefix,
                prisma_migration=MigrationConfig(
                    global_action=json_to_mig_action(
                        migration_action_raw["globalAction"]
                    ),
                    runtime_actions=[
                        (rt, json_to_mig_action(act))
                        for [rt, act] in migration_action_raw["runtimeAction"]
                    ],
                    migration_dir=artifact_config_raw["prismaMigration"][
                        "migrationDir"
                    ],
                ),
                disable_artifact_resolution=artifact_config_raw[
                    "disableArtifactResolution"
                ],
            ),
        )

    def relay_result_to_cli(self, initiator: Command, fn: callable):
        response = {
            "command": initiator.value,
            "typegraphName": self.typegraph.name,
            "typegraphPath": self.typegraph_path,
        }
        try:
            res = fn()
            response["data"] = json.loads(res) if isinstance(res, str) else res
        except Exception as e:
            response["error"] = str(e)
        req = request.Request(
            url=f"{self.endpoint}/response",
            method="POST",
            headers={"Content-Type": "application/json"},
            data=json.dumps(response).encode("utf-8"),
        )

        request.urlopen(req)


def exist_and_not_null(obj: dict, field: str):
    if field in obj:
        return obj[field] is not None
    return False


def json_to_mig_action(obj: dict) -> MigrationAction:
    return MigrationAction(
        create=obj["create"],
        reset=obj["reset"],
    )
