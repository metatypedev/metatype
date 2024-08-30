// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Context } from "./deno_context.ts";

self.onmessage = async function (e) {
  const { modulePath, functionName, run } = e.data;

  const module = await import(modulePath);
  const workflowFn = module[functionName];

  if (typeof workflowFn !== "function") {
    self.postMessage({ error: `Function ${functionName} is not found` });
    // self.close();
    return;
  }

  const ctx = new Context(run);

  ctx.start();
  const result = await workflowFn(ctx);
  ctx.stop(result);

  self.postMessage({ result, run: ctx.getRun() });
  // self.close();
};
