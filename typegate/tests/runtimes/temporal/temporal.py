from typegraph import t, typegraph, Policy, Graph
from typegraph.providers.temporal import TemporalRuntime


@typegraph()
def temporal(g: Graph):
    public = Policy.public()
    temporal = TemporalRuntime("<name>", "<host>")
    arg = t.struct({"some_field": t.string()})

    g.expose(
        public,
        start=temporal.start_workflow("<workflow_type>", arg),
        query=temporal.query_workflow("<query_type>", arg),
        signal=temporal.signal_workflow("<signal_name>", arg).reduce(
            {"workflow_id": "1234"}
        ),
        describe=temporal.describe_workflow(),
    )
