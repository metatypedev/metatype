// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { t, typegraph } from "@typegraph/sdk/index.js";
import { StructTypeBuilder2 } from "./../../../typegraph/node/sdk/src/types.ts";

typegraph("type infer", (g: any) => {
  const address = t.struct({
    street: t.string(),
    city: t.string(),
  });
  const person = t.struct({
    name: t.string(),
    age: t.integer(),
    married: t.boolean(),
    place: address,
  });

  const user = t.struct({
    id: t.uuid().fromRandom(),
    ean: t.ean().fromRandom(),
    name: t.string({}, { config: { gen: "name" } }).fromRandom(),
    age: t.integer({}, { config: { gen: "age", type: "adult" } }).fromRandom(),
    married: t.boolean().fromRandom(),
  });

  // const userJsonType = user.inferCustomJsonType();
  type User = StructTypeBuilder2<typeof user>;
  const _newUser: User = {};

  g.expose({
    test: person,
  });
});
