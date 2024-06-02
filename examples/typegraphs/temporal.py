from typegraph import t, typegraph, Policy, Graph
from typegraph.graph.params import Cors
from typegraph.providers.temporal import TemporalRuntime
import os


@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
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
