# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from wasmtime import Store

from typegraph.gen import Root, RootImports
from typegraph.gen.exports.core import Core
from typegraph.gen.exports.runtimes import Runtimes
from typegraph.gen.exports.utils import Utils
from typegraph.gen.exports.aws import Aws
from typegraph.imports import Abi

store = Store()
abi = Abi()
_typegraph_core = Root(store, RootImports(abi=abi))

core = Core(_typegraph_core)
runtimes = Runtimes(_typegraph_core)
aws = Aws(_typegraph_core)
wit_utils = Utils(_typegraph_core)
