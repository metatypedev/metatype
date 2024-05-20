# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
import re
import sys
from typing import List

from typegraph.gen import imports
from typegraph.gen.types import Err, Ok, Result


def has_match(text: str, items: List[str]) -> bool:
    for pat_s in items:
        pattern = re.compile(pattern=pat_s)
        if bool(re.search(pattern, text)):
            return True
    return False


class HostImpl(imports.HostHost):
    def print(self, msg: str):
        print(msg)

    def eprint(self, msg: str):
        print(msg, file=sys.stderr)

    def expand_path(self, root: str, exclude: List[str]) -> Result[List[str], str]:
        try:
            result = []
            if os.path.isfile(root):
                result.append(root)
            for path, _, files in os.walk(root):
                for name in files:
                    file_path = os.path.join(path, name)
                    if not has_match(file_path, exclude):
                        result.append(file_path)

            return Ok(result)
        except Exception as e:
            return Err(str(e))

    def path_exists(self, path: str) -> Result[bool, str]:
        try:
            return Ok(os.path.isfile(path) or os.path.isdir(path))
        except Exception as e:
            return Err(str(e))

    def read_file(self, path: str) -> Result[bytes, str]:
        try:
            file = open(path, mode="rb")
            return Ok(file.read())
        except Exception as e:
            return Err(str(e))

    def write_file(self, path: str, data: bytes) -> Result[None, str]:
        try:
            dirname = os.path.dirname(path)
            os.makedirs(dirname, exist_ok=True)
            file = open(path, "wb")
            file.write(data)
            return Ok(None)
        except Exception as e:
            return Err(str(e))

    def get_cwd(self) -> Result[str, str]:
        try:
            return Ok(os.getcwd())
        except Exception as e:
            return Err(str(e))
