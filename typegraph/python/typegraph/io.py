from typing import Any, Optional, Dict
from fileinput import FileInput
from dataclasses import dataclass
from typegraph.graph.shared_types import BasicAuth
from typegraph.gen.exports.core import MigrationAction
import json


_JSON_RPC_VERSION = "2.0"


class Log:

    @staticmethod
    def __format(*largs: Any):
        return " ".join(map(str, largs))

    @staticmethod
    def debug(*largs: Any):
        print("debug:", Log.__format(*largs))

    @staticmethod
    def info(*largs: Any):
        print("info:", Log.__format(*largs))

    @staticmethod
    def warn(*largs: Any):
        print("warning:", Log.__format(*largs))

    @staticmethod
    def error(*largs: Any):
        print("error:", Log.__format(*largs))

    @staticmethod
    def failure(data: Any):
        print("failure:", json.dumps(data))

    @staticmethod
    def success(data: Any, noencode: bool = False):
        if noencode:
            print("success:", data)
        else:
            print("success:", json.dumps(data))


class _RpcResponseReader:
    input: FileInput

    def __init__(self):
        self.input = FileInput('-')

    def read(self, rpc_id: int):
        while True:
            line = self.input.readline()
            try:
                parsed = json.loads(line)
            except Exception:
                Log.error("rpc response: failed to parse input as json")
                continue

            if parsed.get("jsonrpc") != _JSON_RPC_VERSION:
                Log.error("rpc response: invalid jsonrpc version")
                continue

            if parsed.get("id") != rpc_id:
                Log.error(f"rpc response: expected sequential requestests, unexpected rpc id {parsed.get('id')}")
                continue

            return parsed.get("result")

class _RpcCall:
    response_reader = _RpcResponseReader()
    latest_rpc_id = 0

    @classmethod
    def call(cls, method: str, params: Any):
        cls.latest_rpc_id = cls.latest_rpc_id + 1
        rpc_id = cls.latest_rpc_id
        rpc_message = json.dumps({
            "jsonrpc": _JSON_RPC_VERSION,
            "id": rpc_id,
            "method": method,
            "params": params
        })

        print(f"jsonrpc: {rpc_message}")
        return cls.response_reader.read(rpc_id)


@dataclass
class TypegateConfig:
    endpoint: str
    auth: BasicAuth

@dataclass
class GlobalConfig:
    typegate: Optional[TypegateConfig]
    prefix: Optional[str]


def migration_action_from_dict(raw: Dict[str, bool]) -> MigrationAction:
    return MigrationAction(
        apply=raw.get("apply", False),
        create=raw.get("create", False),
        reset=raw.get("reset", False),
    )


@dataclass
class TypegraphConfig:
    secrets: Dict[str, str]
    artifact_resolution: bool
    migration_actions: Dict[str, MigrationAction]
    default_migration_action: MigrationAction
    migrations_dir: str

class Rpc:
    @staticmethod
    def get_global_config() -> GlobalConfig:
        # TODO validation??
        res = _RpcCall.call("queryGlobalConfig", None)
        raw_typegate = res.get("typegate")
        typegate = None
        if raw_typegate is not None:
            raw_auth = raw_typegate.get("auth")
            typegate = TypegateConfig(
                endpoint=raw_typegate.get("endpoint"),
                auth=BasicAuth(
                    username=raw_auth.get("username"),
                    password=raw_auth.get("password")
                )
            )
        return GlobalConfig(
            typegate=typegate,
            prefix=res.get("prefix")
        )

    @staticmethod
    def get_typegraph_config(typegraph: str):
        res = _RpcCall.call("queryTypegraphConfig", {
            "typegraph": typegraph
        })

        migration_actions = { k: migration_action_from_dict(v) for k, v in res.get("migrationActions").items() }

        return TypegraphConfig(
            secrets=res.get("secrets"),
            artifact_resolution=res.get("artifactResolution"),
            migration_actions=migration_actions,
            default_migration_action=migration_action_from_dict(res.get("defaultMigrationAction")),
            migrations_dir=res.get("migrationsDir")
        )
