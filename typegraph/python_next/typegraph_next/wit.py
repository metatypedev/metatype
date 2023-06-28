# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from wasmtime import Store

from typegraph_next.gen import TypegraphCore
from typegraph_next.gen.exports.core import Core
from typegraph_next.gen.exports.runtimes import Runtimes

store = Store()
_typegraph_core = TypegraphCore(store)

core = Core(_typegraph_core)
runtimes = Runtimes(_typegraph_core)
