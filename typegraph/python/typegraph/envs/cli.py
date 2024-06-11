# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Optional, List
from os import environ
from enum import Enum

_required_cli_envs = (
    "version",
    "command",
    "typegraph_path",
    "filter",
    "config_dir",
    "working_dir",
    "migrations_dir",
)

_optional_cli_envs = ("prefix",)


class Command(Enum):
    SERIALIZE = "serialize"
    DEPLOY = "deploy"


@dataclass
class CliEnv:
    version: str
    command: Command
    typegraph_path: str
    filter: Optional[List[str]]
    prefix: Optional[str]
    config_dir: str
    working_dir: str
    migrations_dir: str

    @classmethod
    def load(cls) -> Optional["CliEnv"]:
        d = {}
        missing = []

        for key in _required_cli_envs:
            env_name = "MCLI_" + key.upper()
            value = environ.get(env_name)
            if value is None:
                missing.append(env_name)
            else:
                d[key] = value

        if len(missing) != 0:
            if len(d) != 0:
                raise Exception(f"required environment variables: {', '.join(missing)}")
            else:
                return None

        for key in _optional_cli_envs:
            env_name = "MCLI_" + key.upper()
            d[key] = environ.get(env_name)

        try:
            d["command"] = Command(d["command"])
        except ValueError as e:
            variants = ", ".join(v.value for v in Command)
            raise Exception(f"MCLI_COMMAND env value should be one of: {variants}; {e}")

        raw_filter: str = d["filter"]
        if raw_filter == "all":
            filter = None
        else:
            if not raw_filter.startswith("typegraph="):
                raise Exception(f"invalid MCLI_FILTER env value: {raw_filter}")
            filter = raw_filter.removeprefix("typegraph=").split(",")
        d["filter"] = filter

        return cls(**d)


CLI_ENV = CliEnv.load()


def get_cli_env():
    if CLI_ENV is None:
        raise Exception("cannot be called in this context")
    return CLI_ENV
