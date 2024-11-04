// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.ts";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.ts";
import outdent from "outdent";
import { TemporalRuntime } from "@typegraph/sdk/providers/temporal.ts";

function randomFunc() {
  return { data: null };
}

export const notTg = randomFunc();

await typegraph("temporal", (g: any) => {
  const pub = Policy.public();
  const temporal = new TemporalRuntime({
    name: "test",
    hostSecret: "HOST",
    namespaceSecret: "NAMESPACE",
  });
  g.expose({
    startKv: temporal
      .startWorkflow("keyValueStore", t.struct({}))
      .withPolicy(pub),

    query: temporal
      .queryWorkflow("getValue", t.string(), t.string().optional())
      .withPolicy(pub),

    signal: temporal
      .signalWorkflow(
        "setValue",
        t.struct({ key: t.string(), value: t.string() }),
      )
      .withPolicy(pub),

    describe: temporal.describeWorkflow().withPolicy(pub),
  });
});

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

await typegraph("python", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identityLambda: python
      .fromLambda(t.struct({ input: tpe }), tpe, {
        code: "lambda x: x['input']",
      })
      .withPolicy(pub),
    identityDef: python
      .fromDef(t.struct({ input: tpe }), tpe, {
        code: outdent`
        def identity(x):
          return x['input']
        `,
      })
      .withPolicy(pub),
  });
});

await typegraph("random", (g: any) => {
  const random = new RandomRuntime({ seed: 1, reset: "" });
  const pub = Policy.public();

  // test for enum, union, either
  const rgb = t.struct(
    {
      R: t.float(),
      G: t.float(),
      B: t.float(),
    },
    { name: "Rgb" },
  );
  const vec = t.struct(
    { x: t.float(), y: t.float(), z: t.float() },
    {
      name: "Vec",
    },
  );

  const rubix_cube = t.struct(
    { name: t.string(), size: t.integer() },
    {
      name: "Rubix",
    },
  );
  const toygun = t.struct({ color: t.string() }, { name: "Toygun" });

  const testStruct = t.struct({
    field: t.union([rgb, vec]),
    toy: t.either([rubix_cube, toygun]),
    educationLevel: t.enum_(["primary", "secondary", "tertiary"]),
    cents: t.float({ enumeration: [0.25, 0.5, 1.0] }),
  });

  g.expose({
    test1: random
      .gen(
        t.struct({
          email: t.email(),
          country: t.string({}, { config: { gen: "country", full: true } }),
        }),
      )
      .withPolicy(pub),
    test2: random.gen(testStruct).withPolicy(pub),
  });
});
