// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0
import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.ts";

import { Meta } from "test-utils/mod.ts";
import { tg } from "./self_deploy.ts"; // FIXME: deno coverage issues with transpiled version of this file
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/join.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";
import * as path from "std/path/mod.ts";

Meta.test(
  {
    name: "deploy and undeploy typegraph without meta-cli",
  },
  async (t) => {
    const gate = `http://localhost:${t.port}`;
    const auth = new BasicAuth("admin", "password");
    const cwdDir = join(testDir, "e2e", "self_deploy");

    const { serialized, response: gateResponseAdd } = await tgDeploy(tg, {
      typegate: { url: gate, auth },
      secrets: {},
      typegraphPath: path.join(cwdDir, "self_deploy.mjs"),
      migrationsDir: `${cwdDir}/prisma-migrations`,
      defaultMigrationAction: {
        apply: true,
        create: true,
        reset: false,
      },
    });
    assertExists(serialized, "serialized has a value");
    assertEquals(gateResponseAdd, {
      name: "self-deploy",
      messages: [],
      migrations: [],
    });

    const { typegate: gateResponseRem } = await tgRemove(tg, {
      typegate: { url: gate, auth },
    });
    assertEquals(gateResponseRem, { data: { removeTypegraphs: true } });
  },
);
