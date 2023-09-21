from typegraph_next import t, typegraph, Policy, Graph
from typegraph_next.providers.temporal import TemporalRuntime


@typegraph()
def temporal(g: Graph):
    public = Policy.public()
    temporal = TemporalRuntime("<name>", "<host>")
    arg = t.struct({"some_field": t.string()})

    g.expose(
        public,
        start=temporal.start_workflow("<workflow_type>", arg),
        query=temporal.query_workflow("<query_type>", arg),
        signal=temporal.signal_workflow("<signal_name>", arg),
        describe=temporal.describe_workflow(),
    )
