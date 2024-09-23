// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.ts";

export const tg = await typegraph("dedup", (g: any) => {
  const rand = new RandomRuntime({});

  const obj1 = t.struct({
    int1: t.integer(),
    namedInt: t.integer().rename("namedInt"),
    str1: t.string(),
    uuid1: t.uuid(),
    date1: t.datetime(),
    dateInj1: t.datetime().inject("now"),
    // TODO: composite dedup
  });

  const obj2 = t.struct({
    int2: t.integer(),
    int3: t.integer(),
    str2: t.string(),
    uuid2: t.uuid(),
    date2: t.datetime(),
    dateInj2: t.datetime().inject("now"),
  });

  g.expose({
    test: rand.gen(obj1),
    test2: rand.gen(obj2),
  }, Policy.public());
});
