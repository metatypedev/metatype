// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, typegraph } from "@typegraph/sdk";
import { KvRuntime } from "@typegraph/sdk/runtimes/kv";

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
