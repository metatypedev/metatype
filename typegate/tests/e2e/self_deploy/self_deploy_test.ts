// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.js";

import { Meta } from "test-utils/mod.ts";
import { tg } from "./self_deploy.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/join.ts";

const port = 7898;
const auth = new BasicAuth("admin", "password");
const gate = `http://localhost:${port}`;
const cliVersion = "0.3.3";
const cwdDir = join(testDir, "e2e", "self_deploy");

Meta.test("deploy and undeploy typegraph without meta-cli", async (_) => {
  await tgDeploy(tg, {
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

  await tgRemove(tg, { baseUrl: gate, auth });
}, { port, systemTypegraphs: true });
