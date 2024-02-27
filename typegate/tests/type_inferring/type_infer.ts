// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { t, typegraph } from "@typegraph/sdk/index.js";

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

  g.expose({
    test: person,
  });
});
