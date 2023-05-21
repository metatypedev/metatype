# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from attrs import frozen

from typegraph import effects
from typegraph import types as t
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always


@frozen
class TemporalRuntime(Runtime):
    """
    [Documentation](https://metatype.dev/docs/reference/runtimes/temporal)
    """

    name: str
    host: str
    runtime_name: str = always("temporal")

    def data(self, collector):
        data = super().data(collector)
        data["data"].update(
            host=self.host,
        )
        return data

    def start_workflow(self, workflow_type: str, arg):
        return t.func(
            t.struct({"workflow_id": t.string(), "args": t.array(arg)}),
            t.string(),
            StartWorkflowMat(
                runtime=self, effect=effects.create(), workflow_type=workflow_type
            ),
        )

    def signal_workflow(self, signal_name: str, arg):
        return t.func(
            t.struct(
                {"workflow_id": t.string(), "run_id": t.string(), "args": t.array(arg)}
            ),
            t.string(),
            SignalWorkflowMat(
                runtime=self, effect=effects.update(), signal_name=signal_name
            ),
        )

    def query_workflow(self, query_type: str, arg):
        return t.func(
            t.struct(
                {"workflow_id": t.string(), "run_id": t.string(), "args": t.array(arg)}
            ),
            t.string(),
            QueryWorkflowMat(
                runtime=self, effect=effects.none(), query_type=query_type
            ),
        )

    def describe_workflow(self):
        return t.func(
            t.struct({"workflow_id": t.string(), "run_id": t.string()}),
            t.string(),
            DescribeWorkflowMat(runtime=self, effect=effects.none()),
        )


@frozen
class StartWorkflowMat(Materializer):
    runtime: Runtime
    workflow_type: str
    materializer_name: str = always("start_workflow")


@frozen
class SignalWorkflowMat(Materializer):
    runtime: Runtime
    signal_name: str
    materializer_name: str = always("signal_workflow")


@frozen
class QueryWorkflowMat(Materializer):
    runtime: Runtime
    query_type: str
    materializer_name: str = always("query_workflow")


@frozen
class DescribeWorkflowMat(Materializer):
    runtime: Runtime
    materializer_name: str = always("describe_workflow")
