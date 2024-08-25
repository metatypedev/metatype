// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.ts";
import * as path from "@std/path";

const cwd = Deno.args[0];
const PORT = Deno.args[1];
const modulePathStr = Deno.args[2];
const secretsStr = Deno.args[3];
let tgName: string | undefined;

// if the typegraph name is provided given there could be multiple typegraph definitions in the same file
if (Deno.args.length === 5) {
  tgName = Deno.args[4];
}

const gate = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

// resolve the module
const moduleName = path.basename(modulePathStr);
const tgPath = path.join(cwd, moduleName);

const module = await import(tgPath);
let tg;
try {
  tg = tgName !== undefined ? module[tgName] : module.tg;
} catch (_) {
  throw new Error(`No typegraph found in module ${moduleName}`);
}

if (typeof tg === "function") {
  tg = await tg();
}

const secrets = JSON.parse(secretsStr);

const migrationDir = Deno.env.get("MIGRATION_DIR") ?? "prisma-migrations";
let globalActionReset = Deno.env.get("GLOBAL_ACTION_RESET") ?? false;
if (globalActionReset !== false) {
  globalActionReset = globalActionReset === "true";
}
let globalActionCreate = Deno.env.get("GLOBAL_ACTION_CREATE") ?? true;
if (globalActionCreate !== true) {
  globalActionCreate = globalActionCreate === "true";
}

const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
  typegate: { url: gate, auth },
  typegraphPath: tgPath,
  prefix: Deno.env.get("PREFIX") ?? undefined,
  secrets: secrets,
  migrationsDir: `${cwd}/${migrationDir}`,
  defaultMigrationAction: {
    create: globalActionCreate,
    reset: globalActionReset,
  },
});

console.log(serialized);
