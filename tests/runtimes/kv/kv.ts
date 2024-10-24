// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv.ts";

export const tg = await typegraph("kv", (g) => {
  const kv = new KvRuntime("REDIS");
  const pub = Policy.public();
  g.expose({
    get: kv.get(),
    set: kv.set(),
    delete: kv.delete(),
    keys: kv.keys(),
    values: kv.values(),
  }, pub);
});
