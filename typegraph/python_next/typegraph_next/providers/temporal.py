# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union

from typegraph_next.runtimes.base import Materializer, Runtime

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
        data = TemporalRuntimeData(name=name, host=host)
        super().__init__(runtimes.register_temporal_runtime(store, data))
        self.name = name
        self.host = host

    def _generic_temporal_func(
        self,
        operation: TemporalOperationType,
        mat_arg: Union[None, str] = None,
        func_arg: Union[None, t.typedef] = None,
    ):
        data = TemporalOperationData(
            mat_arg=mat_arg,
            func_arg=None if func_arg is None else func_arg.id,
            operation=operation,
        )
        func = runtimes.generate_temporal_operation(store, self.id.value, data)
        if isinstance(func, Err):
            raise Exception(func.value)

        return t.func(
            t.typedef(func.value.inp),
            t.typedef(func.value.out),
            mat=Materializer(id=func.value.mat),
        )

    def start_workflow(self, workflow_type: str, arg: t.typedef):
        return self._generic_temporal_func(
            TemporalOperationTypeStartWorkflow(), workflow_type, arg
        )

    def signal_workflow(self, signal_name: str, arg: t.typedef):
        return self._generic_temporal_func(
            TemporalOperationTypeSignalWorkflow(),
            signal_name,
            arg,
        )

    def query_workflow(self, query_type: str, arg: t.typedef):
        return self._generic_temporal_func(
            TemporalOperationTypeQueryWorkflow(), query_type, arg
        )

    def describe_workflow(self):
        return self._generic_temporal_func(TemporalOperationTypeDescribeWorkflow())
