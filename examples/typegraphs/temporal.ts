// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { TemporalRuntime } from "@typegraph/sdk/providers/temporal.ts";
import process from "node:process";

typegraph(
  {
    name: "temporal",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g: any) => {
    const pub = Policy.public();
    // set `HOST` and `NAMESPACE` under secrets inside metatype.yaml
    const temporal = new TemporalRuntime({
      name: "<name>",
      hostSecret: "HOST",
      namespaceSecret: "NAMESPACE",
    });

    const workflow_id = process.env["ID_FROM_ENV"];
    const arg = t.struct({ some_field: t.string() });

    g.expose(
      {
        start: temporal.startWorkflow("<workflow_type>", arg),
        query: temporal.queryWorkflow("<query_type>", arg, t.string()),
        signal: temporal.signalWorkflow("<signal_name>", arg),
        describe: workflow_id
          ? temporal.describeWorkflow().reduce({ workflow_id })
          : temporal.describeWorkflow(),
      },
      pub,
    );
  },
);
