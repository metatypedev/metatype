// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { sharedConfigSchema } from "./types.ts";
import { configOrExit } from "./loader.ts";

if (!Deno.env.has("VERSION")) {
  // set version for config and workers, only running in main engine
  const { get_version } = await import("native");
  Deno.env.set("VERSION", get_version());
}

export const envSharedWithWorkers = Object.keys(sharedConfigSchema.shape)
  .map((k) => k.toUpperCase());

export const sharedConfig = await configOrExit(
  sharedConfigSchema,
  {
    log_level: "INFO",
  },
  [
    Object.fromEntries(
      envSharedWithWorkers
        .map((k) => [k.toLocaleLowerCase(), Deno.env.get(k)])
        .filter(([_, v]) => v !== undefined),
    ),
  ],
);
