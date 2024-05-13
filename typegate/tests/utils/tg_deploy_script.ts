// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import * as path from "std/path/mod.ts";

function snakeToCamel(snakeCaseString: string) {
  return snakeCaseString.replace(
    /_([a-z])/g,
    (_, letter) => letter.toUpperCase(),
  );
}

const cwd = Deno.args[1];
const PORT = Deno.args[2];
const modulePathStr = Deno.args[3];

const gate = `http://localhost:${PORT}`;
const auth = new BasicAuth("admin", "password");

// resolve the module
const moduleUrl = new URL(modulePathStr, import.meta.url);
const tgName = snakeToCamel(path.basename(path.fromFileUrl(moduleUrl)));

const module = await import(modulePathStr);
if (!module.tg) {
  throw new Error(
    `No typegraph found`,
  );
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
  typegraphPath: path.join(cwd, tgName),
  secrets: {},
});

console.log(serialized);
