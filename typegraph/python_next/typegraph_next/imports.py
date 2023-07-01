# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph_next.gen import imports
from typegraph_next.gen.types import Ok, Result


class Host(imports.Host):
    def read_file(self, path: str) -> Result[str, str]:
        return Ok("hello")
