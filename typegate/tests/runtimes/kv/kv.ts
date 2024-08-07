// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv.ts";

export const tg = await typegraph("kv", (g: any) => {
  const kv = new KvRuntime("REDIS");
  const pub = Policy.public();
  g.expose({
    get: kv.get().withPolicy(pub),
    set: kv.set().withPolicy(pub),
    delete: kv.delete().withPolicy(pub),
    keys: kv.keys().withPolicy(pub),
    all: kv.all().withPolicy(pub),
  });
});
