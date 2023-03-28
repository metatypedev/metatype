// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { loadSync } from "std/dotenv/mod.ts";
import { dirname, fromFileUrl, resolve } from "std/path/mod.ts";

const thisDir = dirname(fromFileUrl(import.meta.url));

const env = loadSync({
  envPath: resolve(thisDir, "../.env.ci"),
});

// env has predecence over dotenv
for (const [k, v] of Object.entries(env)) {
  if (!Deno.env.get(k)) {
    Deno.env.set(k, v);
  }
}
