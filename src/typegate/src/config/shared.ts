// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { sharedConfigSchema } from "./types.ts";
import { configOrExit } from "./loader.ts";

if (!Deno.env.has("VERSION")) {
  // set version for config and workers, only running in main engine
  const { get_version } = await import("native");
  Deno.env.set("VERSION", get_version());
}

export const envSharedWithWorkers = [
  "TEST_OVERRIDE_GQL_ORIGIN",
  ...Object.keys(sharedConfigSchema.shape).map((k) => k.toUpperCase()),
];

export const sharedConfig = await configOrExit(
  sharedConfigSchema,
  {
    log_level: "INFO",
  },
  [
    Object.fromEntries(
      envSharedWithWorkers
        .map((k) => [k.toLocaleLowerCase(), Deno.env.get(k)])
        .filter(([_, v]) => v !== undefined)
    ),
  ]
);
