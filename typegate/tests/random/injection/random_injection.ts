// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

const user = t.struct({
  id: t.uuid().fromRandom("rand"),
  name: t.string({}, { config: { gen: "name" } }).fromRandom("rand"),
  age: t.integer({}, { config: { gen: "age", type: "adult" } }).fromRandom(
    "rand",
  ),
  married: t.boolean().fromRandom("rand"),
  birthday: t.string({ format: "date-time" }).fromRandom("rand"),
  friends: t.list(t.string({}, { config: { gen: "name" } })).fromRandom("rand"),
  phone: t.string({ format: "phone" }).fromRandom("rand"),
  gender: t.string({ format: "gender" }).fromRandom("rand"),
  firstname: t.string({ format: "firstname" }).fromRandom("rand"),
  lastname: t.string({ format: "lastname" }).fromRandom("rand"),
  occupation: t.string({ format: "profession" }).fromRandom("rand"),
  street: t.string({}, { config: { gen: "address" } }).fromRandom("rand"),
  city: t.string({}, { config: { gen: "city" } }).fromRandom("rand"),
  postcode: t.string({}, { config: { gen: "postcode" } }).fromRandom("rand"),
  country: t.string({ format: "country" }).fromRandom("rand"),
  uri: t.string({ format: "uri" }).fromRandom("rand"),
  hostname: t.string({ format: "hostname" }).fromRandom("rand"),
});

typegraph("random_injection", (g: any) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();

  g.expose({
    randomUser: deno.identity(user).withPolicy(pub),
  });
});
