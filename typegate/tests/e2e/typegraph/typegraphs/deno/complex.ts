// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// TODO: use import map
import { g, t, typegraph } from "../../../../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../../../../typegraph/deno/src/runtimes/deno.ts";

const someType = t.struct({
  one: t.array(t.integer(), { min: 3 }, { name: "Two" }),
  two: t.optional(t.proxy("SomeType")),
}, { name: "SomeType" });

const complexType = t.struct({
  a_string: t.string(),
  a_float: t.float({ min: 1, multipleOf: 2 }),
  an_enum: t.enum_(["one", "two"]),
  an_integer_enum: t.integer({ enumeration: [1, 2] }),
  a_float_enum: t.float({ enumeration: [1.5, 2.5] }),
  a_struct: t.struct({ value: t.number() }),
  nested: t.array(t.either([t.string(), t.integer()])).optional(),
  nested_with_ref: someType,
  an_email: t.email(),
}, { name: "ComplexType" });

typegraph("test-complex-types", (expose) => {
  const deno = new DenoRuntime();
  const pub = g.Policy.public();

  expose({
    test: deno.func(
      complexType,
      t.boolean(),
      {
        code: "() => true",
        effect: { tag: "none" } as any,
      },
    ).withPolicy(pub),
  });
});
