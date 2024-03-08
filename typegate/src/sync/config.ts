// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { zBooleanString } from "../log.ts";
import { configOrExit } from "../log.ts";
import { mapKeys } from "std/collections/map_keys.ts";
import { parse } from "std/flags/mod.ts";

export const syncConfigSchemaNaked = {
  sync_enabled: zBooleanString,
  sync_redis_url: z.string().optional().transform((s) => {
    if (s == undefined) return null;
    const url = new URL(s);
    if (url.password === "") {
      url.password = Deno.env.get("SYNC_REDIS_PASSWORD") ?? "";
    }
  }),
  sync_s3_host: z.string().optional().transform((s) => {
    if (s == undefined) return null;
    return new URL(s);
  }),
  sync_s3_region: z.string().optional(),
  sync_s3_bucket: z.string().optional(),
  sync_s3_access_key: z.string().optional(),
  sync_s3_secret_key: z.string().optional(),
  sync_s3_path_style: zBooleanString.optional(),
};

const syncConfigRaw = await configOrExit([
  mapKeys(
    Deno.env.toObject(),
    (k: string) => k.toLowerCase(),
  ),
  parse(Deno.args) as Record<string, unknown>,
], syncConfigSchemaNaked);

const syncConfigSchema = z.object(syncConfigSchemaNaked);

type SyncConfigRaw = z.output<typeof syncConfigSchema>;
export type SyncConfig = Required<SyncConfigRaw>;

function validateSyncConfig(config: SyncConfigRaw): SyncConfig | null {
  if (!config.sync_enabled) {
    const unexpectedVars = Object.entries(config).filter(([key, value]) => {
      if (key === "sync_enabled") return false;
      if (value != null) {
        return true;
      }
    }).map(([key, _]) => key.toUpperCase());

    if (unexpectedVars.length > 0) {
      const unexpectedVarsStr = unexpectedVars.join(", ");
      const msg =
        `Unexpected environment variables when sync is disabled: ${unexpectedVarsStr}.`;
      const suggestion =
        "Make sure to remove these variables or set SYNC_ENABLED=true.";
      throw new Error(`${msg}\n${suggestion}`);
    }

    return null;
  }

  const missingVars = Object.entries(config).filter(([key, value]) => {
    if (value != null) return false;
    // not required
    if (key === "sync_s3_path_style") {
      config.sync_s3_path_style = false;
      return false;
    }
    return true;
  }).map(([key, _]) => key.toUpperCase());

  if (missingVars.length > 0) {
    const missingVarsStr = missingVars.join(", ");
    const msg = `Environment variables required for sync: ${missingVarsStr}.`;
    const suggestion =
      "Make sure to set these variables or set SYNC_ENABLED=false.";
    throw new Error(`${msg}\n${suggestion}`);
  }

  const finalConfig = config as SyncConfig;
  return finalConfig;
}

const syncConfig = validateSyncConfig(syncConfigRaw);

export default syncConfig;
