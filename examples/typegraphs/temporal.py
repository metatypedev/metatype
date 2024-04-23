from typegraph import t, typegraph, Policy, Graph
from typegraph.providers.temporal import TemporalRuntime
import os


@typegraph()
def temporal(g: Graph):
    public = Policy.public()
    temporal = TemporalRuntime(
        "<name>", "<host_secret>", namespace_secret="<ns_secret>"
    )

    workflow_id = os.getenv("ID_FROM_ENV")
    arg = t.struct({"some_field": t.string()})

    g.expose(
        public,
        start=temporal.start_workflow("<workflow_type>", arg),
        query=temporal.query_workflow("<query_type>", arg, t.string()),
        signal=temporal.signal_workflow("<signal_name>", arg),
        describe=temporal.describe_workflow().reduce({"workflow_id": workflow_id})
        if workflow_id
        else temporal.describe_workflow(),
    )
