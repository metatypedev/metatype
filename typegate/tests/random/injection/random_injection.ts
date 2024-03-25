// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

const user = t.struct({
  id: t.uuid().fromRandom(),
  ean: t.ean().fromRandom(),
  name: t.string({}, { config: { gen: "name" } }).fromRandom(),
  age: t.integer({}, { config: { gen: "age", type: "adult" } }).fromRandom(),
  married: t.boolean().fromRandom(),
  email: t.string({ format: "email" }).fromRandom(),
  birthday: t.datetime().fromRandom(),
  friends: t.list(t.string({}, { config: { gen: "name" } })).fromRandom(),
  phone: t.string({}, { config: { gen: "phone" } }).fromRandom(),
  gender: t.string({}, { config: { gen: "gender" } }).fromRandom(),
  firstname: t.string({}, { config: { gen: "first" } }).fromRandom(),
  lastname: t.string({}, { config: { gen: "last" } }).fromRandom(),
  occupation: t.string({}, { config: { gen: "profession" } }).fromRandom(),
  street: t.string({}, { config: { gen: "address" } }).fromRandom(),
  city: t.string({}, { config: { gen: "city" } }).fromRandom(),
  postcode: t.string({}, { config: { gen: "postcode" } }).fromRandom(),
  country: t.string({}, { config: { gen: "country", full: true } })
    .fromRandom(),
  uri: t.string({ format: "uri" }).fromRandom(),
  hostname: t.string({ format: "hostname" }).fromRandom(),
});

typegraph("random_injection", (g: any) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();

  // Configure random injection seed value or the default will be used
  g.configureRandomInjection({ seed: 1 });

  g.expose({
    randomUser: deno.identity(user).withPolicy(pub),
  });
});
