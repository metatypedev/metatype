# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from wasmtime import Store

from typegraph.gen import Root
from typegraph.gen.exports.aws import Aws
from typegraph.gen.exports.core import Core
from typegraph.gen.exports.runtimes import Runtimes
from typegraph.gen.exports.utils import Utils

store = Store()
_typegraph_core = Root(store)

core = Core(_typegraph_core)
runtimes = Runtimes(_typegraph_core)
aws = Aws(_typegraph_core)
wit_utils = Utils(_typegraph_core)
