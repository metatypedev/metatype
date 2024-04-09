// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { TestModule } from "test-utils/test_module.ts";
import { dropSchema, randomSchema } from "test-utils/database.ts";

const m = new TestModule(import.meta);

Meta.test({
  name: "meta undeploy",
  port: true,
  systemTypegraphs: true,
}, async (t) => {
  const schema = randomSchema();
  // prepare
  await dropSchema(schema);

  // no leaked resources error
  await t.should("free resources", async () => {
    await m.cli(
      {},
      "deploy",
      "--target=dev",
      `--gate=http://localhost:${t.port}`,
      "-f",
      "templates/migration.py",
      "--allow-dirty",
    );

    await m.cli(
      {},
      "undeploy",
      "--target=dev",
      `--gate=http://localhost:${t.port}`,
      "--typegraph",
      "migration-failure-test",
    );
  });
});
