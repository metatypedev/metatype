# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typing import Union, Optional

from typegraph.runtimes.base import Runtime

from typegraph.gen.runtimes import (
    TemporalOperationData,
    TemporalRuntimeData,
    TemporalOperationType,
)
from typegraph.sdk import runtimes

from typegraph import t


class TemporalRuntime(Runtime):
    name: str
    host_secret: str
    namespace_secret: Optional[str]

    def __init__(
        self, name: str, host_secret: str, *, namespace_secret: Optional[str] = None
    ):
        data = TemporalRuntimeData(
            name=name, host_secret=host_secret, namespace_secret=namespace_secret
        )
        runtime_id = runtimes.register_temporal_runtime(data)
        super().__init__(runtime_id)
        self.name = name
        self.host_secret = host_secret

    def _generic_temporal_func(
        self,
        operation: TemporalOperationType,
        mat_arg: Union[None, str] = None,
        func_arg: Union[None, t.typedef] = None,
        func_out: Union[None, t.typedef] = None,
    ):
        data = TemporalOperationData(
            mat_arg=mat_arg,
            func_arg=None if func_arg is None else func_arg._id,
            func_out=None if func_out is None else func_out._id,
            operation=operation,
        )
        func_data = runtimes.generate_temporal_operation(self.id, data)
        return t.func.from_type_func(func_data)

    def start_workflow(self, workflow_type: str, arg: t.typedef):
        return self._generic_temporal_func("start_workflow", workflow_type, arg)

    def signal_workflow(self, signal_name: str, arg: t.typedef):
        return self._generic_temporal_func(
            "signal_workflow",
            signal_name,
            arg,
        )

    def query_workflow(self, query_type: str, arg: t.typedef, out: t.typedef):
        return self._generic_temporal_func("query_workflow", query_type, arg, out)

    def describe_workflow(self):
        return self._generic_temporal_func("describe_workflow")
