// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

await typegraph("object-dedup", (g: any) => {
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

  g.expose(
    {
      test: rand.gen(obj1),
      test2: rand.gen(obj2),
    },
    Policy.public(),
  );
});

await typegraph("materializer-dedup", (g: any) => {
  const deno = new DenoRuntime();

  const f = deno.func(
    t.struct({ i: t.integer() }),
    t.struct({ o: t.string() }),
    {
      code: ({ i }) => ({ o: i.toString() }),
    },
  );

  g.expose({
    f1: f.withPolicy(Policy.public()),
    f2: f.withPolicy(Policy.internal()),
  });

  g.expose(
    {
      f3: deno.func(t.struct({}), t.list(t.struct({ key: t.string() })), {
        code: () => [{ key: "value" }],
      }),
    },
    {
      f4: deno.func(t.struct({}), t.optional(t.struct({ key: t.string() })), {
        code: () => ({ key: "value" }),
      }),
    },
    Policy.public(),
  );
});
