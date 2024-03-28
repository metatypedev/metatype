// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { fx, Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { Auth } from "@typegraph/sdk/params.js";

typegraph(
  {
    name: "test-complex-types",
    secrets: ["secret1", "secret2", "secret3"],
    rate: {
      windowSec: 60,
      windowLimit: 128,
      queryLimit: 8,
      localExcess: 5,
      contextIdentifier: "user",
    },
    cors: {
      allowCredentials: false,
      allowHeaders: [],
      allowMethods: ["GET"],
      allowOrigin: ["*"],
      exposeHeaders: [],
      maxAgeSec: 120,
    },
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const someType = t.struct({
      one: t.list(t.integer(), { min: 3 }, { name: "Two" }),
      two: t.optional(g.ref("SomeType")),
    }, { name: "SomeType" });

    const complexType = t.struct({
      a_string: t.string(),
      a_float: t.float({ min: 1, multipleOf: 2 }),
      an_enum: t.enum_(["one", "two"]),
      an_integer_enum: t.integer({ enumeration: [1, 2] }, {
        config: { key: "value" },
      }),
      a_float_enum: t.float({ enumeration: [1.5, 2.5] }),
      a_struct: t.struct({ value: t.float() }),
      nested: t.list(t.either([t.string(), t.integer()])).optional(),
      nested_with_ref: someType,
      an_email: t.email(),
    }, { name: "ComplexType" });

    g.auth(Auth.basic(["testBasicAuth"]));
    g.auth(Auth.hmac256("testHmacAuth"));

    g.expose({
      test: deno.func(
        complexType,
        t.boolean(),
        {
          code: "() => true",
          effect: fx.read(),
        },
      ).withPolicy(pub),
    });
  },
);
