// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.ts";

import { Meta } from "test-utils/mod.ts";
import { tg } from "./self_deploy.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "@std/path/join";
import { assertEquals, assertExists } from "@std/assert";
import * as path from "@std/path";

Meta.test(
  {
    name: "deploy and undeploy typegraph without meta-cli",
  },
  async (t) => {
    // FIXME: Uncomment after implementing mode B (MET-754)
    //const gate = `http://localhost:${t.port}`;
    //const auth = new BasicAuth("admin", "password");
    //const cwdDir = join(testDir, "e2e", "self_deploy");
    //
    //const { serialized, response: gateResponseAdd } = await tgDeploy(tg, {
    //  typegate: { url: gate, auth },
    //  secrets: {},
    //  typegraphPath: path.join(cwdDir, "self_deploy.mjs"),
    //  migrationsDir: `${cwdDir}/prisma-migrations`,
    //  defaultMigrationAction: {
    //    apply: true,
    //    create: true,
    //    reset: false,
    //  },
    //});
    //assertExists(serialized, "serialized has a value");
    //assertEquals(gateResponseAdd, {
    //  name: "self-deploy",
    //  messages: [],
    //  migrations: [],
    //});
    //// pass the typegraph name
    //const { typegate: gateResponseRem } = await tgRemove(tg.name, {
    //  typegate: { url: gate, auth },
    //});
    //assertEquals(gateResponseRem, { data: { removeTypegraphs: true } });
  },
);
