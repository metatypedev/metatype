# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Callable, Optional
from typegraph.wit import ArtifactResolutionConfig


@dataclass
class TypegraphOutput:
    name: str
    serialize: Callable[[Optional[ArtifactResolutionConfig]], str]
