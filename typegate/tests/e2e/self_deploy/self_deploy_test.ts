// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.js";

import { Meta } from "test-utils/mod.ts";
import { tg } from "./self_deploy.mjs"; // FIXME: deno coverage issues with transpiled version of this file
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/join.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";

const port = 7898;
const auth = new BasicAuth("admin", "password");
const gate = `http://localhost:${port}`;
const cliVersion = "0.3.3";
const cwdDir = join(testDir, "e2e", "self_deploy");

Meta.test("deploy and undeploy typegraph without meta-cli", async (_) => {
  const { serialized, typegate: gateResponseAdd } = await tgDeploy(tg, {
    baseUrl: gate,
    cliVersion,
    auth,
    secrets: {},
    artifactsConfig: {
      prismaMigration: {
        action: {
          create: true,
          reset: false,
        },
        migrationDir: "prisma-migrations",
      },
      dir: cwdDir,
    },
  });
  assertExists(serialized, "serialized has a value");
  assertEquals(gateResponseAdd, {
    data: {
      addTypegraph: { name: "self-deploy", messages: [], migrations: [] },
    },
  });

  const { typegate: gateResponseRem } = await tgRemove(tg, {
    baseUrl: gate,
    auth,
  });
  assertEquals(gateResponseRem, { data: { removeTypegraphs: true } });
}, { port, systemTypegraphs: true });
