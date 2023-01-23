# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from attrs import frozen
from typegraph import types as t
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.base import Runtime
from typegraph.utils.attrs import always


@frozen
class TemporalRuntime(Runtime):
    """Interacts with Temporal server.

    This runtime is *experimental* state and is subject to change.
    """

    host: str
    runtime_name: str = always("temporal")

    def data(self, collector):
        data = super().data(collector)
        data["data"].update(
            host=self.host,
        )
        return data

    def start_workflow(self, workflow: str, arg):
        return t.func(
            t.struct({"workflow_id": t.string(), "args": t.array(arg)}),
            t.string(),
            StartWorkflowMat(self, workflow),
        )


@frozen
class StartWorkflowMat(Materializer):
    runtime: Runtime
    workflow: str
    materializer_name: str = always("start_workflow")
