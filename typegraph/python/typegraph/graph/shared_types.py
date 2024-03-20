# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from base64 import b64encode
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple
from typegraph.wit import ArtifactResolutionConfig


@dataclass
class FinalizationResult:
    tgJson: str
    ref_artifacts: List[Tuple[str, str]]


@dataclass
class TypegraphOutput:
    name: str
    serialize: Callable[[Optional[ArtifactResolutionConfig]], FinalizationResult]


@dataclass
class BasicAuth:
    username: str
    password: str

    def as_header_value(self):
        payload = b64encode(f"{self.username}:{self.password}".encode("utf-8")).decode(
            "utf-8"
        )
        return f"Basic {payload}"
