# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List
from typegraph.gen import imports
from typegraph.gen.types import Err, Ok, Result
import os
import re


def has_match(text: str, items: List[str]) -> bool:
    for pat_s in items:
        pattern = re.compile(pattern=pat_s)
        if bool(re.search(pattern, text)):
            return True
    return False


class HostImpl(imports.HostHost):
    def printf(self, msg: str):
        print(msg)

    def expand_glob(self, root: str, exclude: List[str]) -> Result[List[str], str]:
        try:
            result = []
            for path, _, files in os.walk(root):
                for name in files:
                    file_path = os.path.join(path, name)
                    if not has_match(file_path, exclude):
                        result.append(file_path)
            return Ok(result)
        except Exception as e:
            return Err(str(e, "utf-8"))

    def read_file(self, path: str) -> Result[bytes, str]:
        try:
            file = open(path, mode="rb")
            return Ok(file.read())
        except Exception as e:
            return Err(str(e, "utf-8"))

    def write_file(self, path: str, data: bytes) -> Result[None, str]:
        try:
            file = open(path, "wb")
            file.write(data)
            return Ok(None)
        except Exception as e:
            return Err(str(e, "utf-8"))

    def get_cwd(self) -> Result[str, str]:
        try:
            return Ok(os.getcwd())
        except Exception as e:
            return Err(str(e, "utf-8"))
