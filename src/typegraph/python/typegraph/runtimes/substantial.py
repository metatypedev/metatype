# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Union
from typegraph import t
from typegraph.gen.runtimes import (
    RedisBackend,
    SubstantialBackend,
    SubstantialOperationData,
    SubstantialOperationType,
    SubstantialRuntimeData,
    WorkflowFileDescription,
    WorkflowKind,
)
from typegraph.runtimes.base import Runtime
from typegraph.sdk import runtimes


class Backend:
    def dev_memory() -> SubstantialBackend:
        return "memory"

    def dev_fs() -> SubstantialBackend:
        return "fs"

    def redis(connection_string_secret: str) -> SubstantialBackend:
        return {
            "redis": RedisBackend(connection_string_secret=connection_string_secret)
        }


class SubstantialRuntime(Runtime):
    def __init__(
        self,
        backend: SubstantialBackend,
        file_descriptions: List[WorkflowFileDescription],
    ):
        data = SubstantialRuntimeData(backend, file_descriptions)
        super().__init__(runtimes.register_substantial_runtime(data))
        self.backend = backend

    def _generic_substantial_func(
        self,
        operation: SubstantialOperationType,
        func_arg: Union[None, "t.typedef"] = None,
        func_out: Union[None, "t.typedef"] = None,
    ):
        data = SubstantialOperationData(
            func_arg=None if func_arg is None else func_arg._id,
            func_out=None if func_out is None else func_out._id,
            operation=operation,
        )
        func_data = runtimes.generate_substantial_operation(self.id, data)

        return t.func.from_type_func(func_data)

    def start(self, kwargs: "t.struct"):
        return self._generic_substantial_func("start", kwargs, None)

    def start_raw(self):
        return self._generic_substantial_func("start_raw", None, None)

    def stop(self):
        return self._generic_substantial_func("stop", None, None)

    def send(self, payload: "t.typedef"):
        return self._generic_substantial_func("send", payload, None)

    def send_raw(self):
        return self._generic_substantial_func("send_raw", None, None)

    def query_resources(self):
        return self._generic_substantial_func("resources", None, None)

    def query_results(self, output: "t.typedef"):
        return self._generic_substantial_func("results", None, output)

    def query_results_raw(self):
        return self._generic_substantial_func("results_raw", None, None)

    def _internal_link_parent_child(self):
        return self._generic_substantial_func("internal_link_parent_child", None, None)

    def internals(self):
        return {
            "_sub_internal_start": self.start_raw(),
            "_sub_internal_stop": self.stop(),
            "_sub_internal_send": self.send_raw(),
            "_sub_internal_results": self.query_results_raw(),
            "_sub_internal_link_parent_child": self._internal_link_parent_child(),
        }


class WorkflowFile:
    def __init__(self, file: str, kind: WorkflowKind, deps: List[str] = []):
        self.file = file
        self.kind = kind
        self.deps = deps
        self.workflows: List[str] = []

    def deno(*, file: str, deps: List[str] = []):
        return WorkflowFile(file, "deno", deps)

    def python(*, file: str, deps: List[str] = []):
        return WorkflowFile(file, "python", deps)

    def import_(self, names: List[str]):
        self.workflows += names
        return self

    def build(self):
        return WorkflowFileDescription(
            workflows=self.workflows, deps=self.deps, file=self.file, kind=self.kind
        )
