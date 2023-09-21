// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { TemporalRuntime } from "@typegraph/deno/src/providers/temporal.ts";

typegraph("temporal", (g) => {
  const pub = Policy.public();
  const temporal = new TemporalRuntime("<name>", "<host>");
  const arg = t.struct({ some_field: t.string() });

  g.expose(
    {
      start: temporal.startWorkflow("<workflow_type>", arg).withPolicy(pub),
      query: temporal.queryWorkflow("<query_type>", arg).withPolicy(pub),
      signal: temporal.signalWorkflow("<signal_name>", arg).withPolicy(pub),
      describe: temporal.describeWorkflow().withPolicy(pub),
    },
  );
});
