from typegraph import t, typegraph, Policy, Graph
from typegraph.graph.params import Cors
from typegraph.providers.temporal import TemporalRuntime
import os


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def temporal(g: Graph):
    public = Policy.public()
    # set `HOST` and `NAMESPACE` under secrets inside metatype.yaml
    temporal = TemporalRuntime("<name>", "HOST", namespace_secret="NAMESPACE")

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
