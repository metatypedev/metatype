// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { deepMerge } from "std/collections/deep_merge.ts";

export class ConfigError extends Error {
  constructor(public issues: any) {
    super(`config error: ${JSON.stringify(issues)}`);
  }
}

export function parseConfig<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  defaults: Partial<z.input<typeof schema>>,
  sources: Array<Record<string, unknown>>,
) {
  const raw = [defaults as Record<string, unknown>, ...sources].reduce(
    (acc, obj) => deepMerge(acc, obj),
    {} as Record<string, unknown>,
  );

  return schema.safeParse(raw);
}

export function configOrThrow<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  defaults: Partial<z.input<typeof schema>>,
  sources: Array<Record<string, unknown>>,
) {
  const result = parseConfig(schema, defaults, sources);
  if (!result.success) {
    throw new ConfigError(result.error.issues);
  }
  return result.data;
}

export function configOrExit<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  defaults: Partial<z.input<typeof schema>>,
  sources: Array<Record<string, unknown>>,
) {
  try {
    return configOrThrow(schema, defaults, sources);
  } catch (e) {
    console.error("failed to parse config");
    if (e instanceof ConfigError) {
      console.error(e.issues);
      Deno.exit(1);
    }
  }
}
