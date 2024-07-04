# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from base64 import b64encode
from dataclasses import dataclass
from typing import Callable, List
from typegraph.gen.exports.core import Artifact
from typegraph.wit import SerializeParams


@dataclass
class FinalizationResult:
    tgJson: str
    ref_artifacts: List[Artifact]


@dataclass
class TypegraphOutput:
    name: str
    serialize: Callable[[SerializeParams], FinalizationResult]


@dataclass
class BasicAuth:
    username: str
    password: str

    def as_header_value(self):
        payload = b64encode(f"{self.username}:{self.password}".encode("utf-8")).decode(
            "utf-8"
        )
        return f"Basic {payload}"
