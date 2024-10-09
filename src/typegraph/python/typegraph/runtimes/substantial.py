# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Union
from typegraph import t
from typegraph.gen.exports.runtimes import (
    RedisBackend,
    SubstantialBackend,
    SubstantialBackendFs,
    SubstantialBackendMemory,
    SubstantialBackendRedis,
    SubstantialOperationData,
    SubstantialOperationType,
    SubstantialOperationTypeSend,
    SubstantialOperationTypeStart,
    SubstantialOperationTypeStop,
    SubstantialOperationTypeResources,
    SubstantialOperationTypeResults,
    SubstantialRuntimeData,
    WorkflowFileDescription,
    WorkflowKind,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class Backend:
    def dev_memory():
        return SubstantialBackendMemory()

    def dev_fs():
        return SubstantialBackendFs()

    def redis(connection_string_secret: str):
        return SubstantialBackendRedis(value=RedisBackend(connection_string_secret))


class SubstantialRuntime(Runtime):
    def __init__(
        self,
        backend: SubstantialBackend,
        file_descriptions: List[WorkflowFileDescription],
    ):
        data = SubstantialRuntimeData(backend, file_descriptions)
        super().__init__(runtimes.register_substantial_runtime(store, data))
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
        func_data = runtimes.generate_substantial_operation(store, self.id.value, data)

        if isinstance(func_data, Err):
            raise Exception(func_data.value)

        return t.func.from_type_func(func_data.value)

    def start(self, kwargs: "t.struct"):
        operation = SubstantialOperationTypeStart()
        return self._generic_substantial_func(operation, kwargs, None)

    def stop(self):
        operation = SubstantialOperationTypeStop()
        return self._generic_substantial_func(operation, None, None)

    def send(self, payload: "t.typedef", event_name=Union[str, None]):
        operation = SubstantialOperationTypeSend()
        event = t.struct(
            {
                "name": t.string()
                if event_name is None
                else t.string().set(event_name),
                "payload": payload,
            }
        )
        return self._generic_substantial_func(operation, event, None)

    def query_resources(self):
        operation = SubstantialOperationTypeResources()
        return self._generic_substantial_func(operation, None, None)

    def query_results(self, output: "t.typedef"):
        operation = SubstantialOperationTypeResults()
        return self._generic_substantial_func(operation, None, output)


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
