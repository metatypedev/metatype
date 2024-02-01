# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List
from wasmtime import Store

from typegraph.gen import Root, RootImports, imports
from typegraph.gen.exports.aws import Aws
from typegraph.gen.exports.core import Core
from typegraph.gen.exports.runtimes import Runtimes
from typegraph.gen.exports.utils import Utils
from typegraph.gen.types import Result


class Host(imports.Host):
    def expand_glob(self, root: str, exclude: List[str]) -> Result[List[str], str]:
        raise NotImplementedError

    def read_file(self, path: str) -> Result[bytes, str]:
        raise NotImplementedError

    def get_cwd(self) -> Result[str, str]:
        raise NotImplementedError


store = Store()
_typegraph_core = Root(store, RootImports(Host()))

core = Core(_typegraph_core)
runtimes = Runtimes(_typegraph_core)
aws = Aws(_typegraph_core)
wit_utils = Utils(_typegraph_core)
