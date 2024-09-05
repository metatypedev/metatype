# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from enum import Enum
from typing import Optional, Any

from typegraph.python.typegraph.graph.shared_types import BasicAuth
from typegraph.python.typegraph.io import DeployTarget


class Encoding(Enum):
    JSON = "application/json"
    BINARY = "application/octet-stream"


class Typegate:
    base_url: str
    auth: Optional[BasicAuth]

    def __init__(self, target: DeployTarget):
        self.base_url = target.base_url
        self.auth = target.auth

    def exec_request(
        self,
        path: str,
        *,
        method: str,
        body: Optional[Any],
        encoding: Encoding = Encoding.JSON,
    ):
        pass
