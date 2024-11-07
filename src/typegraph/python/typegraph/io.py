# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Any, Optional, Dict
from fileinput import FileInput
from dataclasses import dataclass
from typegraph.graph.shared_types import BasicAuth
from typegraph.gen.exports.core import MigrationAction
import json


_JSONRPC_VERSION = "2.0"


def write_rpc_message(message: str):
    # we do not chunk the message as Python's print function supports long lines
    print(f"jsonrpc$: {message}")


def rpc_notify(method: str, params: Any):
    message = json.dumps(
        {
            "jsonrpc": _JSONRPC_VERSION,
            "method": method,
            "params": params,
        }
    )
    write_rpc_message(message)


class Log:
    @staticmethod
    def __format(*largs: Any):
        return " ".join(map(str, largs))

    @staticmethod
    def debug(*largs: Any):
        rpc_notify("Debug", {"message": Log.__format(*largs)})

    @staticmethod
    def info(*largs: Any):
        rpc_notify("Info", {"message": Log.__format(*largs)})

    @staticmethod
    def warn(*largs: Any):
        rpc_notify("Warning", {"message": Log.__format(*largs)})

    @staticmethod
    def error(*largs: Any):
        rpc_notify("Error", {"message": Log.__format(*largs)})

    @staticmethod
    def failure(data: Any):
        rpc_notify("Failure", {"data": data})

    @staticmethod
    def success(data: Any, noencode: bool = False):
        if noencode:
            parsed = json.loads(data)
            rpc_notify("Success", {"data": parsed})
        else:
            rpc_notify("Success", {"data": data})


class _RpcResponseReader:
    input: FileInput

    def __init__(self):
        self.input = FileInput("-")

    def read(self, rpc_id: int):
        while True:
            line = self.input.readline()
            try:
                parsed = json.loads(line)
            except Exception:
                Log.error("rpc response: failed to parse input as json")
                continue

            if parsed.get("jsonrpc") != _JSONRPC_VERSION:
                Log.error("rpc response: invalid jsonrpc version")
                continue

            if parsed.get("id") != rpc_id:
                Log.error(
                    f"rpc response: expected sequential requestests, unexpected rpc id {parsed.get('id')}"
                )
                continue

            return parsed.get("result")


class _RpcCall:
    response_reader = _RpcResponseReader()
    latest_rpc_id = 0

    @classmethod
    def call(cls, method: str, params: Any):
        cls.latest_rpc_id = cls.latest_rpc_id + 1
        rpc_id = cls.latest_rpc_id
        rpc_message = json.dumps(
            {
                "jsonrpc": _JSONRPC_VERSION,
                "id": rpc_id,
                "method": method,
                "params": params,
            }
        )

        write_rpc_message(rpc_message)
        return cls.response_reader.read(rpc_id)


@dataclass
class DeployTarget:
    base_url: str
    auth: BasicAuth


@dataclass
class DeployData:
    secrets: Dict[str, str]
    default_migration_action: MigrationAction
    migration_actions: Dict[str, MigrationAction]


def migration_action_from_dict(raw: Dict[str, bool]) -> MigrationAction:
    return MigrationAction(
        apply=raw.get("apply", False),
        create=raw.get("create", False),
        reset=raw.get("reset", False),
    )


class Rpc:
    _deploy_target: Optional[DeployTarget] = None

    # cached
    @classmethod
    def get_deploy_target(cls) -> DeployTarget:
        if cls._deploy_target is None:
            # TODO validation??
            res = _RpcCall.call("GetDeployTarget", None)

            raw_auth = res.get("auth")
            if raw_auth is None:
                raise Exception(f"invalid data from rpc call: {res}")

            auth = BasicAuth(raw_auth.get("username"), raw_auth.get("password"))

            cls._deploy_target = DeployTarget(
                base_url=res["baseUrl"],
                auth=auth,
            )

        return cls._deploy_target

    @staticmethod
    def get_deploy_data(typegraph: str) -> DeployData:
        res = _RpcCall.call("GetDeployData", {"typegraph": typegraph})

        return DeployData(
            secrets=res["secrets"],
            default_migration_action=migration_action_from_dict(
                res["defaultMigrationAction"]
            ),
            migration_actions={
                k: migration_action_from_dict(v)
                for k, v in res["migrationActions"].items()
            },
        )
