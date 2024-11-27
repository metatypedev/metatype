# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Optional
from typegraph import t
from typegraph.gen.exports.runtimes import (
    RedisBackend,
    SubstantialBackend,
    SubstantialBackendFs,
    SubstantialBackendMemory,
    SubstantialBackendRedis,
    SubstantialOperationData,
    SubstantialOperationDataInternalLinkParentChild,
    SubstantialOperationDataResources,
    SubstantialOperationDataResults,
    SubstantialOperationDataResultsRaw,
    SubstantialOperationDataSend,
    SubstantialOperationDataSendRaw,
    SubstantialOperationDataStart,
    SubstantialOperationDataStartRaw,
    SubstantialOperationDataStop,
    SubstantialRuntimeData,
    SubstantialStartData,
    WorkflowFileDescription,
    WorkflowKind,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class SubstantialRuntime(Runtime):
    def __init__(
        self,
        backend: SubstantialBackend,
        file_descriptions: List[WorkflowFileDescription],
    ):
        data = SubstantialRuntimeData(backend, file_descriptions)
        res = runtimes.register_substantial_runtime(store, data)
        if isinstance(res, Err):
            raise Exception(res.value)
        super().__init__(res.value)
        self.backend = backend

    def _generic_substantial_func(
        self,
        data: SubstantialOperationData,
    ):
        func_data = runtimes.generate_substantial_operation(store, self.id, data)

        if isinstance(func_data, Err):
            raise Exception(func_data.value)

        return t.func.from_type_func(func_data.value)

    def start(self, kwargs: "t.struct", *, secrets: Optional[List[str]] = None):
        return self._generic_substantial_func(
            SubstantialOperationDataStart(
                SubstantialStartData(kwargs._id, secrets or [])
            )
        )

    def start_raw(self, *, secrets: Optional[List[str]] = None):
        return self._generic_substantial_func(
            SubstantialOperationDataStartRaw(SubstantialStartData(None, secrets or []))
        )

    def stop(self):
        return self._generic_substantial_func(SubstantialOperationDataStop())

    def send(self, payload: "t.typedef"):
        return self._generic_substantial_func(SubstantialOperationDataSend(payload._id))

    def send_raw(self):
        return self._generic_substantial_func(SubstantialOperationDataSendRaw())

    def query_resources(self):
        return self._generic_substantial_func(SubstantialOperationDataResources())

    def query_results(self, output: "t.typedef"):
        return self._generic_substantial_func(
            SubstantialOperationDataResults(output._id)
        )

    def query_results_raw(self):
        return self._generic_substantial_func(SubstantialOperationDataResultsRaw())

    def _internal_link_parent_child(self):
        return self._generic_substantial_func(
            SubstantialOperationDataInternalLinkParentChild()
        )

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
    def dev_memory():
        return SubstantialBackendMemory()

    @staticmethod
    def dev_fs():
        return SubstantialBackendFs()

    @staticmethod
    def redis(connection_string_secret: str):
        return SubstantialBackendRedis(value=RedisBackend(connection_string_secret))


class WorkflowFile:
    def __init__(self, file: str, kind: WorkflowKind, deps: List[str] = []):
        self.file = file
        self.kind = kind
        self.deps = deps
        self.workflows: List[str] = []

    def deno(*, file: str, deps: List[str] = []):
        return WorkflowFile(file, WorkflowKind.DENO, deps)

    def python(*, file: str, deps: List[str] = []):
        return WorkflowFile(file, WorkflowKind.PYTHON, deps)

    def import_(self, names: List[str]):
        self.workflows += names
        return self

    def build(self):
        return WorkflowFileDescription(
            workflows=self.workflows, deps=self.deps, file=self.file, kind=self.kind
        )
