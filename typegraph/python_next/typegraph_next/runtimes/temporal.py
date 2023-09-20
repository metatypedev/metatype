# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union

from typegraph_next.runtimes.base import Runtime

from typegraph_next.gen.exports.runtimes import (
    TemporalOperationData,
    TemporalRuntimeData,
    TemporalOperationType,
    TemporalOperationTypeStartWorkflow,
    TemporalOperationTypeSignalWorkflow,
    TemporalOperationTypeQueryWorkflow,
    TemporalOperationTypeDescribeWorkflow,
)
from typegraph_next.gen.types import Err
from typegraph_next.wit import runtimes, store

from typegraph_next import t


class TemporalRuntime(Runtime):
    host: str
    name: str

    def __init__(self, name: str, host: str):
        self.name = name
        self.host = host
        data = TemporalRuntimeData(name=name, host=host)
        super().__init__(runtimes.register_temporal_runtime(store, data))

    def _generic_temporal_func(
        self,
        mat_arg: Union[None, str],
        func_arg: Union[None, t.typedef],
        operation: TemporalOperationType,
    ):
        data = TemporalOperationData(
            mat_arg=mat_arg,
            func_arg=None if func_arg is None else func_arg.id,
            operation=operation,
        )
        id = runtimes.generate_temporal_operation(store, self.id.value, data)
        if isinstance(id, Err):
            raise Exception(id.value)

        return t.typedef(id=id.value)

    def start_workflow(self, workflow_type: str, arg: t.typedef):
        return self._generic_temporal_func(
            workflow_type, arg, TemporalOperationTypeStartWorkflow()
        )

    def signal_workflow(self, signal_name: str, arg: t.typedef):
        return self._generic_temporal_func(
            signal_name, arg, TemporalOperationTypeSignalWorkflow()
        )

    def query_workflow(self, query_type: str, arg: t.typedef):
        return self._generic_temporal_func(
            query_type, arg, TemporalOperationTypeQueryWorkflow()
        )

    def describe_workflow(self):
        return self._generic_temporal_func(
            None, None, TemporalOperationTypeDescribeWorkflow()
        )
