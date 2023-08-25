// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { RandomRuntime } from "@typegraph/deno/src/runtimes/random.ts";

typegraph("random", (g) => {
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
