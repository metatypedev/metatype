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
    SubstantialOperationTypeRessources,
    SubstantialOperationTypeResults,
    SubstantialRuntimeData,
    Workflow,
    WorkflowKind,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class Backend:
    def memory():
        return SubstantialBackendMemory()

    def fs(config: RedisBackend):
        return SubstantialBackendFs()

    def redis(config: RedisBackend):
        return SubstantialBackendRedis(value=config)


class SubstantialRuntime(Runtime):
    def __init__(self, backend: SubstantialBackend):
        data = SubstantialRuntimeData(backend)
        super().__init__(runtimes.register_substantial_runtime(store, data))
        self.backend = backend

    def _using_workflow(
        self,
        workflow: Workflow,
    ):
        self.workflow = workflow
        return self

    def _generic_substantial_func(
        self,
        operation: SubstantialOperationType,
        func_arg: Union[None, "t.typedef"] = None,
        func_out: Union[None, "t.typedef"] = None,
    ):
        data = SubstantialOperationData(
            func_arg=None if func_arg is None else func_arg.id,
            func_out=None if func_out is None else func_out.id,
            operation=operation,
        )
        func_data = runtimes.generate_substantial_operation(store, self.id.value, data)

        if isinstance(func_data, Err):
            raise Exception(func_data.value)

        return t.func.from_type_func(func_data.value)

    def start(self, kwargs: "t.struct"):
        operation = SubstantialOperationTypeStart(self.workflow)
        return self._generic_substantial_func(operation, kwargs, None)

    def stop(self):
        operation = SubstantialOperationTypeStop(self.workflow)
        return self._generic_substantial_func(operation, None, None)

    def send(self, payload: "t.typedef"):
        operation = SubstantialOperationTypeSend(self.workflow)
        return self._generic_substantial_func(operation, payload, None)

    def query_ressources(self):
        operation = SubstantialOperationTypeRessources(self.workflow)
        return self._generic_substantial_func(operation, None, None)

    def query_results(self, output: "t.typedef"):
        operation = SubstantialOperationTypeResults(self.workflow)
        return self._generic_substantial_func(operation, None, output)

    def deno(
        backend: SubstantialBackend,
        *,
        file: str,
        name: str,
        deps: List[str] = [],
    ):
        substantial = SubstantialRuntime(backend)
        return substantial._using_workflow(
            Workflow(name=name, file=file, deps=deps, kind=WorkflowKind.DENO)
        )

    def python(
        backend: SubstantialBackend,
        *,
        file: str,
        name: str,
        deps: List[str] = [],
    ):
        substantial = SubstantialRuntime(backend)
        return substantial._using_workflow(
            Workflow(name=name, file=file, deps=deps, kind=WorkflowKind.PYTHON)
        )
