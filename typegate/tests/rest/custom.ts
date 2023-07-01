// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { g, t, typegraph } from "../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../typegraph/deno/src/runtimes/deno.ts";

typegraph({
  name: "custom",
  queries: {
    dynamic: false,
    folder: "custom_dir",
  },
  builder: ({ expose }) => {
    const deno = new DenoRuntime();
    const pub = g.Policy.public();

    const ping = deno.func(t.struct({}), t.integer(), {
      code: "() => 1",
    }).withPolicy(pub);

    expose({
      ping,
    });
  },
});
