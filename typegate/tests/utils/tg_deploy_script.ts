// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import * as path from "std/path/mod.ts";

const cwd = Deno.args[0];
const PORT = Deno.args[1];
const modulePathStr = Deno.args[2];
const secretsStr = Deno.args[3];

const gate = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

// resolve the module
const moduleName = path.basename(modulePathStr);
const tgPath = path.join(cwd, moduleName);

const module = await import(tgPath);
if (!module.tg) {
  throw new Error(`No typegraph found in module ${moduleName}`);
}

const secrets = JSON.parse(secretsStr);

const disableArtRes = Deno.env.get("DISABLE_ART_RES");
const codegen = Deno.env.get("CODEGEN");
const migrationDir = Deno.env.get("MIGRATION_DIR") ?? "prisma-migrations";
let globalActionReset = Deno.env.get("GLOBAL_ACTION_RESET") ?? false;
if (globalActionReset !== false) {
  globalActionReset = globalActionReset === "true";
}
let globalActionCreate = Deno.env.get("GLOBAL_ACTION_CREATE") ?? true;
if (globalActionCreate !== true) {
  globalActionCreate = globalActionCreate === "true";
}

const tg = module.tg;
const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
  baseUrl: gate,
  auth,
  artifactsConfig: {
    disableArtifactResolution: disableArtRes,
    codegen,
    prismaMigration: {
      globalAction: {
        create: globalActionCreate,
        reset: globalActionReset,
      },
      migrationDir: migrationDir,
    },
    dir: cwd,
  },
  typegraphPath: tgPath,
  secrets: secrets,
});

console.log(serialized);
