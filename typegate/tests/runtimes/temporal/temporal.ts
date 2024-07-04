// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { TemporalRuntime } from "@typegraph/sdk/providers/temporal.ts";

export const tg = await typegraph("temporal", (g: any) => {
  const pub = Policy.public();
  const temporal = new TemporalRuntime({
    name: "test",
    hostSecret: "HOST",
    namespaceSecret: "NAMESPACE",
  });
  g.expose({
    startKv: temporal
      .startWorkflow("keyValueStore", t.struct({}))
      .withPolicy(pub),

    query: temporal
      .queryWorkflow("getValue", t.string(), t.string().optional())
      .withPolicy(pub),

    signal: temporal
      .signalWorkflow(
        "setValue",
        t.struct({ key: t.string(), value: t.string() }),
      )
      .withPolicy(pub),

    describe: temporal.describeWorkflow().withPolicy(pub),
  });
});
