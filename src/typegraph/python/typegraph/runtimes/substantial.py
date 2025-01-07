# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Optional
from typegraph import t
from typegraph.gen.runtimes import (
    RedisBackend,
    SubstantialBackend,
    SubstantialOperationData,
    SubstantialRuntimeData,
    SubstantialStartData,
    WorkflowFileDescription,
    WorkflowKind,
)
from typegraph.runtimes.base import Runtime
from typegraph.sdk import runtimes


class SubstantialRuntime(Runtime):
    def __init__(
        self,
        backend: SubstantialBackend,
        file_descriptions: List[WorkflowFileDescription],
    ):
        data = SubstantialRuntimeData(backend, file_descriptions)
        res = runtimes.register_substantial_runtime(data)
        super().__init__(res)
        self.backend = backend

    def _generic_substantial_func(
        self,
        data: SubstantialOperationData,
    ):
        func_data = runtimes.generate_substantial_operation(self.id, data)

        return t.func.from_type_func(func_data)

    def start(self, kwargs: "t.struct", *, secrets: Optional[List[str]] = None):
        return self._generic_substantial_func(
            {"start": SubstantialStartData(kwargs._id, secrets or [])}
        )

    def start_raw(self, *, secrets: Optional[List[str]] = None):
        return self._generic_substantial_func(
            {"start_raw": SubstantialStartData(None, secrets or [])}
        )

    def stop(self):
        return self._generic_substantial_func("stop")

    def send(self, payload: "t.typedef"):
        return self._generic_substantial_func({"send": payload._id})

    def send_raw(self):
        return self._generic_substantial_func("send_raw")

    def query_resources(self):
        return self._generic_substantial_func("resources")

    def query_results(self, output: "t.typedef"):
        return self._generic_substantial_func({"results": output._id})

    def query_results_raw(self):
        return self._generic_substantial_func("results_raw")

    def advanced_filters(self):
        return self._generic_substantial_func("advanced_filters")

    def _internal_link_parent_child(self):
        return self._generic_substantial_func("internal_link_parent_child")

    def internals(self):
        return {
            "_sub_internal_start": self.start_raw(),
            "_sub_internal_stop": self.stop(),
            "_sub_internal_send": self.send_raw(),
            "_sub_internal_results": self.query_results_raw(),
            "_sub_internal_link_parent_child": self._internal_link_parent_child(),
        }


class Backend:
    @staticmethod
    def dev_memory() -> SubstantialBackend:
        return "memory"

    @staticmethod
    def dev_fs() -> SubstantialBackend:
        return "fs"

    @staticmethod
    def redis(connection_string_secret: str) -> SubstantialBackend:
        return {"redis": RedisBackend(connection_string_secret)}


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
