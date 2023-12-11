// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchema } from "test-utils/database.ts";

const m = new TestModule(import.meta);

const port = 7897;

Meta.test("meta undeploy", async (t) => {
  // prepare
  await dropSchema(`e2e${port}alt`);

  // no leaked resources error
  await t.should("free resources", async () => {
    await m.cli(
      {},
      "deploy",
      "--target",
      `dev${port}`,
      "-f",
      "templates/migration.py",
      "--allow-dirty",
    );

    await m.cli(
      {},
      "undeploy",
      "--target",
      `dev${port}`,
      "--typegraph",
      "migration-failure-test",
    );
  });
}, { port, systemTypegraphs: true });
