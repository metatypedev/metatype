// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.js";

typegraph("random", (g: any) => {
  const random = new RandomRuntime({ seed: 1, reset: "" });
  const pub = Policy.public();

  // test for enum, union, either
  const rgb = t.struct({
    "R": t.float(),
    "G": t.float(),
    "B": t.float(),
  }, { name: "Rgb" });
  const vec = t.struct({ "x": t.float(), "y": t.float(), "z": t.float() }, {
    name: "Vec",
  });

  const rubix_cube = t.struct({ "name": t.string(), "size": t.integer() }, {
    name: "Rubix",
  });
  const toygun = t.struct({ "color": t.string() }, { name: "Toygun" });

  const testStruct = t.struct({
    field: t.union([rgb, vec]),
    toy: t.either([rubix_cube, toygun]),
    educationLevel: t.enum_(["primary", "secondary", "tertiary"]),
    cents: t.float({ enumeration: [0.25, 0.5, 1.0] }),
  });

  g.expose({
    test1: random.gen(
      t.struct({
        email: t.email(),
        country: t.string({}, { config: { gen: "country", full: true } }),
      }),
    ).withPolicy(pub),
    test2: random.gen(
      testStruct,
    ).withPolicy(pub),
  });
});
