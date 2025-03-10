// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { sharedConfigSchema } from "./types.ts";
import { configOrExit } from "./loader.ts";
import type { LevelName } from "@std/log";

if (!Deno.env.has("VERSION")) {
  // set version for config and workers, only running in main engine
  const { get_version } = await import("native");
  Deno.env.set("VERSION", get_version());
}

export const MAIN_DEFAULT_LEVEL = "INFO" satisfies LevelName;
export const ADDRESSED_DEFAULT_LEVEL = "ERROR" satisfies LevelName;

export const envSharedWithWorkers = [
  ...Object.keys(sharedConfigSchema.shape).map((k) => k.toUpperCase()),
];

export const sharedConfig = await configOrExit(
  sharedConfigSchema,
  {
    log_level: MAIN_DEFAULT_LEVEL,
  },
  [
    Object.fromEntries(
      envSharedWithWorkers
        .map((k) => [k.toLocaleLowerCase(), Deno.env.get(k)])
        .filter(([_, v]) => v !== undefined),
    ),
  ],
);
