// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/mod.js";
import { TemporalRuntime } from "@typegraph/sdk/providers/temporal.js";

typegraph("temporal", (g: any) => {
  const pub = Policy.public();
  const temporal = new TemporalRuntime("<name>", "<host>");
  const arg = t.struct({ some_field: t.string() });

  g.expose(
    {
      start: temporal.startWorkflow("<workflow_type>", arg).withPolicy(pub),
      query: temporal.queryWorkflow("<query_type>", arg).withPolicy(pub),
      signal: temporal.signalWorkflow("<signal_name>", arg).reduce({
        workflow_id: "1234",
      }).withPolicy(pub),
      describe: temporal.describeWorkflow().withPolicy(pub),
    },
  );
});
