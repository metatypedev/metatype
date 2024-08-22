# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import List, Union
from typegraph import t
from typegraph.gen.exports.runtimes import (
    SubstantialOperationData,
    SubstantialOperationType,
    SubstantialOperationTypeSend,
    SubstantialOperationTypeStart,
    SubstantialOperationTypeStop,
    SubstantialRuntimeData,
    Workflow,
    WorkflowKind,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Runtime
from typegraph.wit import runtimes, store


class SubstantialRuntime(Runtime):
    def __init__(self, endpoint: str, basic_auth: str):
        data = SubstantialRuntimeData(endpoint=endpoint, basic_auth_secret=basic_auth)
        super().__init__(runtimes.register_substantial_runtime(store, data))

    def _using_workflow(
        self,
        *,
        file: str,
        name: str,
        deps: List[str] = [],
    ):
        self.workflow = Workflow(
            name=name, file=file, deps=deps, kind=WorkflowKind.PYTHON
        )
        return self

    def _generic_substantial_func(
        self,
        operation: SubstantialOperationType,
        func_arg: Union[None, "t.typedef"] = None,
    ):
        data = SubstantialOperationData(
            func_arg=None if func_arg is None else func_arg.id, operation=operation
        )
        func_data = runtimes.generate_substantial_operation(store, self.id, data)
        if isinstance(func_data, Err):
            raise Exception(func_data.value)

        return t.func.from_type_func(func_data.value)

    def start(self):
        operation = SubstantialOperationTypeStart(self.workflow)
        return self._generic_substantial_func(operation, None)

    def stop(self):
        operation = SubstantialOperationTypeStop(self.workflow)
        return self._generic_substantial_func(operation, None)

    def send(self, payload: "t.typedef"):
        operation = SubstantialOperationTypeSend(self.workflow)
        return self._generic_substantial_func(operation, payload)
