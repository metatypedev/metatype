# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import glob
from typing import List

from typegraph_next.gen import imports
from typegraph_next.gen.types import Err, Ok, Result


class Abi(imports.Abi):
    def log(self, message: str) -> None:
        print(message)

    def glob(self, pattern: str, exts: List[str]) -> Result[List[str], str]:
        files = []
        for ext in exts:
            files += glob.glob(f"{pattern}.{ext}", recursive=True)
        return Ok(files)

    def read_file(self, path: str) -> Result[str, str]:
        try:
            with open(path, "r") as f:
                return Ok(f.read())
        except Exception as e:
            return Err(str(e))

    def write_file(self, path: str, data: str) -> Result[None, str]:
        try:
            with open(path, "w") as f:
                f.write(data)
            return Ok(None)
        except Exception as e:
            return Err(str(e))
