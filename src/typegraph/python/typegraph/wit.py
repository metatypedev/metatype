# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

# from wasmtime import Store
# from typing import List
#
# from typegraph.gen import Root, RootImports
# from typegraph.gen.exports.aws import Aws
# from typegraph.gen.exports.core import Core, Error
# from typegraph.gen.exports.runtimes import Runtimes
# from typegraph.gen.exports.utils import Utils
# from typegraph.host.host import HostImpl
#
# # Make sure the imports are similar to the node implementation
# from typegraph.gen.exports.core import (
#     SerializeParams,  # noqa
#     PrismaMigrationConfig,  # noqa
#     MigrationAction,  # noqa
#
# )
# store = Store()
# _typegraph_core = Root(store, RootImports(HostImpl()))
#
import typegraph.gen.aws as aws
import typegraph.gen.core as core
import typegraph.gen.runtimes as runtimes
import typegraph.gen.utils as utils

aws = aws
core = core
runtimes = runtimes
sdk_utils = utils

#
#
# class ErrorStack(Exception):
#     stack: List[str]
#
#     def __init__(self, err: Error):
#         super(ErrorStack, self).__init__("\n".join(f"- {msg}" for msg in err.stack))
#         self.stack = err.stack
#
#     def from_str(msg: str) -> "ErrorStack":
#         return ErrorStack(Error([msg]))
