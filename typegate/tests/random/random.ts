// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/mod.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

typegraph("random", (g: any) => {
  const random = new RandomRuntime({ seed: 1, reset: "" });
  const pub = Policy.public();

  g.expose({
    test1: random.gen(
      t.struct({
        email: t.email(),
        country: t.string({}, { config: { gen: "country", full: true } }),
      }),
    ).withPolicy(pub),
  });
});
