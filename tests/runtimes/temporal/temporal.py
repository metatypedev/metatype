# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import t, typegraph, Policy, Graph
from typegraph.providers.temporal import TemporalRuntime


@typegraph()
def temporal(g: Graph):
    public = Policy.public()
    temporal = TemporalRuntime(
        "<name>", "<host_secret>", namespace_secret="<ns_secret>"
    )
    arg = t.struct({"some_field": t.string()})

    g.expose(
        public,
        start=temporal.start_workflow("<workflow_type>", arg),
        query=temporal.query_workflow("<query_type>", arg, t.string()),
        signal=temporal.signal_workflow("<signal_name>", arg).reduce(
            {"workflow_id": "1234"}
        ),
        describe=temporal.describe_workflow(),
    )
