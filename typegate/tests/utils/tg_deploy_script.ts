// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import * as path from "std/path/mod.ts";

const cwd = Deno.args[0];
const PORT = Deno.args[1];
const modulePathStr = Deno.args[2];

const gate = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

// resolve the module
const moduleName = path.basename(modulePathStr);
const tgPath = path.join(cwd, moduleName);

const module = await import(tgPath);
if (!module.tg) {
  throw new Error(`No typegraph found`);
}

const tg = module.tg;
const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
  baseUrl: gate,
  auth,
  artifactsConfig: {
    prismaMigration: {
      globalAction: {
        create: true,
        reset: false,
      },
      migrationDir: "prisma-migrations",
    },
    dir: cwd,
  },
  typegraphPath: tgPath,
  secrets: {},
});

console.log(serialized);
